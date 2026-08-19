package tech.buildwithpartha.lifeos.user.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import tech.buildwithpartha.lifeos.user.domain.OnboardingStatus;
import tech.buildwithpartha.lifeos.user.domain.OnboardingStep;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class OnboardingControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private RawToken sessionToken;
  private RawToken csrfToken;
  private Cookie sessionCookie;

  @Autowired
  OnboardingControllerTests(
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
                        EmailAddress.of("onboard-test-" + UUID.randomUUID() + "@example.test"),
                        "Onboarding Tester",
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
  void getOnboardingRequiresAuthentication() throws Exception {
    mockMvc.perform(get("/onboarding")).andExpect(status().isUnauthorized());
  }

  @Test
  void getOnboardingReturnsCurrentStateWhenAuthenticated() throws Exception {
    mockMvc
        .perform(get("/onboarding").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.onboardingVersion").value(1))
        .andExpect(jsonPath("$.onboardingStatus").value(OnboardingStatus.NOT_STARTED.name()))
        .andExpect(jsonPath("$.profile.displayName").value("Onboarding Tester"))
        .andExpect(jsonPath("$.profile.timeZone").value("UTC"))
        .andExpect(jsonPath("$.planningDefaults.focusDurationMinutes").value(25));
  }

  @Test
  void putWelcomeRejectsMissingCsrfToken() throws Exception {
    mockMvc
        .perform(
            put("/onboarding/welcome")
                .cookie(sessionCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayName\": \"New Name\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
  }

  @Test
  void putWelcomeRejectsBlankDisplayName() throws Exception {
    mockMvc
        .perform(
            put("/onboarding/welcome")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayName\": \"   \"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
  }

  @Test
  void putWelcomeSavesDisplayNameAndAdvancesStep() throws Exception {
    mockMvc
        .perform(
            put("/onboarding/welcome")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayName\": \"Partha Verified\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.profile.displayName").value("Partha Verified"))
        .andExpect(jsonPath("$.onboardingStatus").value(OnboardingStatus.IN_PROGRESS.name()))
        .andExpect(jsonPath("$.lastCompletedStep").value(OnboardingStep.WELCOME.name()));
  }

  @Test
  void putTimeAndWeekRejectsInvalidTimezone() throws Exception {
    mockMvc
        .perform(
            put("/onboarding/time-and-week")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"timeZone\": \"Not/A_Real_Zone\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[?(@.field == 'timeZone')]").exists());
  }

  @Test
  void putTimeAndWeekSavesValidTimezoneAndWeekStart() throws Exception {
    mockMvc
        .perform(
            put("/onboarding/time-and-week")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"timeZone\": \"Asia/Kolkata\", \"locale\": \"en-IN\", \"weekStart\": 1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.profile.timeZone").value("Asia/Kolkata"))
        .andExpect(jsonPath("$.profile.locale").value("en-IN"))
        .andExpect(jsonPath("$.profile.weekStart").value(1))
        .andExpect(jsonPath("$.lastCompletedStep").value(OnboardingStep.TIME_AND_WEEK.name()));
  }

  @Test
  void putPlanningDefaultsSavesValidWorkHoursAndFocusTimes() throws Exception {
    String body =
        """
        {
          "workingDays": [1, 2, 3, 4, 5],
          "workStartTime": "09:00",
          "workEndTime": "17:30",
          "overnightSchedule": false,
          "dailyFocusTargetMinutes": 180,
          "focusDurationMinutes": 30,
          "breakDurationMinutes": 5,
          "skipped": false
        }
        """;

    mockMvc
        .perform(
            put("/onboarding/planning-defaults")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.planningDefaults.workingDays[0]").value(1))
        .andExpect(jsonPath("$.planningDefaults.workStartTime").value("09:00"))
        .andExpect(jsonPath("$.planningDefaults.workEndTime").value("17:30"))
        .andExpect(jsonPath("$.planningDefaults.dailyFocusTargetMinutes").value(180))
        .andExpect(jsonPath("$.planningDefaults.focusDurationMinutes").value(30))
        .andExpect(jsonPath("$.planningDefaults.breakDurationMinutes").value(5))
        .andExpect(jsonPath("$.lastCompletedStep").value(OnboardingStep.PLANNING_DEFAULTS.name()));
  }

  @Test
  void putPlanningDefaultsAcceptsSkip() throws Exception {
    mockMvc
        .perform(
            put("/onboarding/planning-defaults")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"skipped\": true}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.lastCompletedStep").value(OnboardingStep.PLANNING_DEFAULTS.name()));
  }

  @Test
  void postCompleteMarksOnboardingCompleted() throws Exception {
    mockMvc
        .perform(
            post("/onboarding/complete")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.onboardingStatus").value(OnboardingStatus.COMPLETED.name()))
        .andExpect(jsonPath("$.lastCompletedStep").value(OnboardingStep.START.name()))
        .andExpect(jsonPath("$.onboardingCompletedAt").isNotEmpty());
  }
}
