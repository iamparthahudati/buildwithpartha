package tech.buildwithpartha.lifeos.common.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.filter.ShallowEtagHeaderFilter;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class CachePolicyIntegrationTests {

  @Autowired private WebApplicationContext context;
  @Autowired private UserRepository userRepository;
  @Autowired private SessionRepository sessionRepository;
  @Autowired private SecureTokenGenerator tokenGenerator;
  @Autowired private ShallowEtagHeaderFilter shallowEtagHeaderFilter;
  @Autowired private ApiCachePolicyFilter apiCachePolicyFilter;

  private MockMvc mockMvc;
  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;

  private UUID userBId;
  private Cookie userBCookie;
  private RawToken userBCsrfToken;

  @BeforeEach
  void setUp() {
    mockMvc =
        MockMvcBuilders.webAppContextSetup(context)
            .addFilters(apiCachePolicyFilter, shallowEtagHeaderFilter)
            .apply(springSecurity())
            .build();

    userId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("cache-user-" + UUID.randomUUID() + "@example.test"),
                        "Cache User A",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

    userBId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("cache-user-b-" + UUID.randomUUID() + "@example.test"),
                        "Cache User B",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

    RawToken sessionToken = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionToken.hash(),
            csrfToken.hash(),
            Instant.now(),
            Optional.empty()));
    sessionCookie = new Cookie("lifeos_session", sessionToken.value());

    RawToken userBSessionToken = tokenGenerator.generate();
    userBCsrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userBId,
            userBSessionToken.hash(),
            userBCsrfToken.hash(),
            Instant.now(),
            Optional.empty()));
    userBCookie = new Cookie("lifeos_session", userBSessionToken.value());
  }

  @Test
  @DisplayName("API GET endpoints return default security and proxy-bypass headers")
  void apiGetEndpointsReturnDefaultCacheHeaders() throws Exception {
    mockMvc
        .perform(get("/user/preferences").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(
            header().string("Cache-Control", "private, no-cache, max-age=0, must-revalidate"))
        .andExpect(header().string("Pragma", "no-cache"))
        .andExpect(header().string("Expires", "0"))
        .andExpect(header().string("Vary", "Accept-Encoding, Cookie, Authorization"))
        .andExpect(header().string("CDN-Cache-Control", "no-store"))
        .andExpect(header().string("Cloudflare-CDN-Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("ETag header is computed on GET requests and 304 is returned when ETag matches")
  void etagHeaderAnd304NotModifiedHandling() throws Exception {
    MvcResult initialResult =
        mockMvc
            .perform(get("/user/preferences").cookie(sessionCookie))
            .andExpect(status().isOk())
            .andExpect(header().exists("ETag"))
            .andReturn();

    String etag = initialResult.getResponse().getHeader("ETag");
    assertThat(etag).isNotNull().isNotBlank();

    // Re-request with matching If-None-Match
    mockMvc
        .perform(get("/user/preferences").cookie(sessionCookie).header("If-None-Match", etag))
        .andExpect(status().isNotModified())
        .andExpect(header().string("ETag", etag))
        .andExpect(
            header().string("Cache-Control", "private, no-cache, max-age=0, must-revalidate"));
  }

  @Test
  @DisplayName("Resource mutation invalidates previous ETag and produces fresh 200 OK")
  void resourceMutationInvalidatesETag() throws Exception {
    MvcResult initialResult =
        mockMvc
            .perform(get("/user/preferences").cookie(sessionCookie))
            .andExpect(status().isOk())
            .andReturn();

    String oldEtag = initialResult.getResponse().getHeader("ETag");

    String requestBody =
        """
        {
          "workingDays": [1, 2, 3, 4, 5],
          "workStartTime": "09:00",
          "workEndTime": "17:00",
          "overnightSchedule": false,
          "dailyFocusTargetMinutes": 240,
          "focusDurationMinutes": 50,
          "breakDurationMinutes": 10,
          "longBreakDurationMinutes": 15,
          "focusSessionsBeforeLongBreak": 4,
          "autoStartBreaks": false,
          "autoStartFocusSessions": false,
          "soundEnabled": true,
          "browserNotificationsEnabled": false
        }
        """;

    mockMvc
        .perform(
            put("/user/preferences")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
        .andExpect(status().isOk());

    MvcResult newResult =
        mockMvc
            .perform(
                get("/user/preferences").cookie(sessionCookie).header("If-None-Match", oldEtag))
            .andExpect(status().isOk())
            .andReturn();

    String newEtag = newResult.getResponse().getHeader("ETag");
    assertThat(newEtag).isNotNull().isNotEqualTo(oldEtag);
  }

  @Test
  @DisplayName("Account isolation ensures User B does not receive 304 for User A ETag")
  void accountIsolationPreventsCrossAccountCacheSharing() throws Exception {
    String userAPayload =
        """
        {
          "workingDays": [1, 2, 3],
          "workStartTime": "08:00",
          "workEndTime": "16:00",
          "overnightSchedule": false,
          "dailyFocusTargetMinutes": 300,
          "focusDurationMinutes": 45,
          "breakDurationMinutes": 10,
          "longBreakDurationMinutes": 20,
          "focusSessionsBeforeLongBreak": 3,
          "autoStartBreaks": false,
          "autoStartFocusSessions": false,
          "soundEnabled": true,
          "browserNotificationsEnabled": false
        }
        """;

    mockMvc
        .perform(
            put("/user/preferences")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(userAPayload))
        .andExpect(status().isOk());

    MvcResult userAResult =
        mockMvc
            .perform(get("/user/preferences").cookie(sessionCookie))
            .andExpect(status().isOk())
            .andReturn();

    String userAEtag = userAResult.getResponse().getHeader("ETag");

    MvcResult userBResult =
        mockMvc
            .perform(
                get("/user/preferences").cookie(userBCookie).header("If-None-Match", userAEtag))
            .andExpect(status().isOk())
            .andExpect(header().string("Vary", "Accept-Encoding, Cookie, Authorization"))
            .andExpect(
                header().string("Cache-Control", "private, no-cache, max-age=0, must-revalidate"))
            .andReturn();

    String userBEtag = userBResult.getResponse().getHeader("ETag");
    assertThat(userBEtag).isNotNull().isNotEqualTo(userAEtag);
  }

  @Test
  @DisplayName("Custom @CachePolicy annotation applies specified Cache-Control directive")
  void customCachePolicyAnnotationAppliesDirective() throws Exception {
    mockMvc
        .perform(get("/test-cache/custom").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "private, max-age=60"))
        .andExpect(header().string("CDN-Cache-Control", "private"))
        .andExpect(header().string("Cloudflare-CDN-Cache-Control", "private"));
  }
}
