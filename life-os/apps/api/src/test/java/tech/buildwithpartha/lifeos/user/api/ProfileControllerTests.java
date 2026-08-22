package tech.buildwithpartha.lifeos.user.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
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
class ProfileControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private RawToken sessionToken;
  private RawToken csrfToken;
  private Cookie sessionCookie;

  @Autowired
  ProfileControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @BeforeEach
  void setUp() {
    userId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("profile-test-" + UUID.randomUUID() + "@example.test"),
                        "Profile Tester",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

    sessionToken = tokenGenerator.generate();
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
  }

  @Test
  void getProfileRequiresAuthentication() throws Exception {
    mockMvc.perform(get("/user/profile")).andExpect(status().isUnauthorized());
  }

  @Test
  void getProfileReturnsCurrentProfileWhenAuthenticated() throws Exception {
    mockMvc
        .perform(get("/user/profile").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.displayName").value("Profile Tester"))
        .andExpect(jsonPath("$.timeZone").value("UTC"))
        .andExpect(jsonPath("$.locale").value("en-IN"))
        .andExpect(jsonPath("$.weekStart").value(1));
  }

  @Test
  void putProfileRejectsMissingCsrfToken() throws Exception {
    String body =
        """
        {
          "displayName": "New Name",
          "timeZone": "UTC",
          "locale": "en-IN",
          "weekStart": 1
        }
        """;
    mockMvc
        .perform(
            put("/user/profile")
                .cookie(sessionCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
  }

  @Test
  void putProfileUpdatesSettingsWhenValid() throws Exception {
    String body =
        """
        {
          "displayName": "Partha H",
          "timeZone": "America/New_York",
          "locale": "en-US",
          "weekStart": 7
        }
        """;
    mockMvc
        .perform(
            put("/user/profile")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.displayName").value("Partha H"))
        .andExpect(jsonPath("$.timeZone").value("America/New_York"))
        .andExpect(jsonPath("$.locale").value("en-US"))
        .andExpect(jsonPath("$.weekStart").value(7));
  }

  @Test
  void getPreferencesReturnsDefaults() throws Exception {
    mockMvc
        .perform(get("/user/preferences").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.planningDefaults.focusDurationMinutes").value(25))
        .andExpect(jsonPath("$.planningDefaults.breakDurationMinutes").value(5));
  }

  @Test
  void putPreferencesUpdatesPlanningDefaults() throws Exception {
    String body =
        """
        {
          "workingDays": [1, 2, 3, 4, 5, 6],
          "workStartTime": "08:00",
          "workEndTime": "16:00",
          "overnightSchedule": false,
          "dailyFocusTargetMinutes": 240,
          "focusDurationMinutes": 50,
          "breakDurationMinutes": 10
        }
        """;

    mockMvc
        .perform(
            put("/user/preferences")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.planningDefaults.workingDays.length()").value(6))
        .andExpect(jsonPath("$.planningDefaults.workStartTime").value("08:00"))
        .andExpect(jsonPath("$.planningDefaults.focusDurationMinutes").value(50));
  }
}
