package tech.buildwithpartha.lifeos.report.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;
import tech.buildwithpartha.lifeos.user.domain.UserProfileRepository;

/**
 * Private shell/Today foundation gate over the backend authorization and date boundary (LOS-0616).
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class ShellTodayFoundationGateIntegrationTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;

  @Autowired
  ShellTodayFoundationGateIntegrationTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      UserProfileRepository userProfileRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.userProfileRepository = userProfileRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @Test
  void anonymousVisitorsCannotReadToday() throws Exception {
    mockMvc
        .perform(get("/today"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
  }

  @Test
  void anUnverifiedAccountCannotUseAnOtherwiseActiveSessionToReadToday() throws Exception {
    User unverified =
        userRepository.save(
            User.signup(
                UUID.randomUUID(),
                EmailAddress.of("unverified-gate-" + UUID.randomUUID() + "@example.test"),
                "Unverified Gate Account",
                Instant.now()));

    mockMvc
        .perform(get("/today").cookie(issueSessionCookie(unverified.id())))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
  }

  @Test
  void verifiedAccountsReceiveAnExactLocalDateAndHonestFoundationEmptyData() throws Exception {
    User verified =
        userRepository.save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of("verified-gate-" + UUID.randomUUID() + "@example.test"),
                    "Verified Gate Account",
                    Instant.now())
                .verify(Instant.now()));
    ZoneId zoneId = ZoneId.of("Asia/Kolkata");
    UserProfile profile = userProfileRepository.findByUserId(verified.id()).orElseThrow();
    userProfileRepository.save(
        profile.withUpdates(verified.displayName(), zoneId.getId(), "en-IN", 1, profile.version()));

    MvcResult result =
        mockMvc
            .perform(get("/today").cookie(issueSessionCookie(verified.id())))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", containsString("private")))
            .andExpect(header().string("Cache-Control", containsString("no-store")))
            .andExpect(jsonPath("$.userTimeZone").value(zoneId.getId()))
            .andExpect(jsonPath("$.mit.status").value("EMPTY"))
            .andExpect(jsonPath("$.tasks.status").value("EMPTY"))
            .andExpect(jsonPath("$.tasks.data.tasks").isEmpty())
            .andExpect(jsonPath("$.schedule.status").value("EMPTY"))
            .andExpect(jsonPath("$.schedule.data.blocks").isEmpty())
            .andExpect(jsonPath("$.focusSummary.status").value("EMPTY"))
            .andExpect(jsonPath("$.focusSummary.data.isSessionActive").value(false))
            .andExpect(jsonPath("$.activeProjects.status").value("EMPTY"))
            .andExpect(jsonPath("$.activeProjects.data.projects").isEmpty())
            .andExpect(jsonPath("$.review.status").value("EMPTY"))
            .andExpect(jsonPath("$.brainDump.status").value("SUCCESS"))
            .andExpect(jsonPath("$.brainDump.data.unprocessedCount").value(0))
            .andExpect(jsonPath("$.habits.status").value("EMPTY"))
            .andExpect(jsonPath("$.habits.data.habits").isEmpty())
            .andExpect(jsonPath("$.metrics.status").value("EMPTY"))
            .andExpect(jsonPath("$.metrics.data.metrics").isEmpty())
            .andReturn();

    String response = result.getResponse().getContentAsString();
    Instant generatedAt = Instant.parse(JsonPath.read(response, "$.generatedAt"));
    String localDate = JsonPath.read(response, "$.localDate");

    assertThat(localDate).isEqualTo(generatedAt.atZone(zoneId).toLocalDate().toString());
    assertThat(response)
        .doesNotContain("Portfolio refresh", "Prepare weekly review", "example project");
  }

  private Cookie issueSessionCookie(UUID userId) {
    RawToken sessionToken = tokenGenerator.generate();
    RawToken csrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionToken.hash(),
            csrfToken.hash(),
            Instant.now(),
            Optional.empty()));
    return new Cookie("lifeos_session", sessionToken.value());
  }
}
