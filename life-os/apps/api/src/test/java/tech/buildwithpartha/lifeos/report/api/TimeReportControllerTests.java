package tech.buildwithpartha.lifeos.report.api;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockDomainFixture;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.user.domain.PlanningDefaults;
import tech.buildwithpartha.lifeos.user.domain.UserPreferences;
import tech.buildwithpartha.lifeos.user.domain.UserPreferencesRepository;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class TimeReportControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final UserPreferencesRepository preferencesRepository;
  private final TimeBlockRepository timeBlockRepository;
  private final FocusSessionRepository focusSessionRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;

  @Autowired
  TimeReportControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      UserPreferencesRepository preferencesRepository,
      TimeBlockRepository timeBlockRepository,
      FocusSessionRepository focusSessionRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.preferencesRepository = preferencesRepository;
    this.timeBlockRepository = timeBlockRepository;
    this.focusSessionRepository = focusSessionRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @BeforeEach
  void setUp() {
    userId = createAccount("time-report-owner");
    sessionCookie = issueSession(userId);
  }

  @Test
  void requiresAuthentication() throws Exception {
    mockMvc
        .perform(get("/reports/time").param("date", "2026-08-25").param("timeZone", "UTC"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void returnsOwnerScopedPlannedVersusActualTimeWithALabelledDenominator() throws Exception {
    Instant now = Instant.parse("2026-08-25T00:00:00Z");
    UserPreferences preferences = UserPreferences.createDefault(userId, now);
    preferencesRepository.save(
        preferences.updatePlanningDefaults(
            new PlanningDefaults(
                List.of(1, 2, 3, 4, 5),
                Optional.of(LocalTime.of(9, 0)),
                Optional.of(LocalTime.of(17, 0)),
                false,
                Optional.of(120),
                25,
                5),
            now));

    timeBlockRepository.save(
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(userId)
            .withCategory("Focus")
            .withStartAt(Instant.parse("2026-08-25T03:30:00Z"))
            .withEndAt(Instant.parse("2026-08-25T04:30:00Z"))
            .withSourceTimeZone("Asia/Kolkata")
            .build());
    focusSessionRepository.save(
        FocusSession.start(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                Optional.empty(),
                Duration.ofMinutes(30),
                Duration.ZERO,
                Instant.parse("2026-08-25T03:30:00Z"))
            .complete(Instant.parse("2026-08-25T04:00:00Z")));

    UUID otherUserId = createAccount("time-report-other");
    timeBlockRepository.save(
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(otherUserId)
            .withCategory("Focus")
            .withStartAt(Instant.parse("2026-08-25T03:30:00Z"))
            .withEndAt(Instant.parse("2026-08-25T05:30:00Z"))
            .withSourceTimeZone("Asia/Kolkata")
            .build());

    mockMvc
        .perform(
            get("/reports/time")
                .cookie(sessionCookie)
                .param("date", "2026-08-25")
                .param("timeZone", "Asia/Kolkata"))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", containsString("no-store")))
        .andExpect(jsonPath("$.localDate").value("2026-08-25"))
        .andExpect(jsonPath("$.timeZone").value("Asia/Kolkata"))
        .andExpect(jsonPath("$.actualFocusMinutes").value(30))
        .andExpect(jsonPath("$.unscheduledFocusMinutes").value(30))
        .andExpect(jsonPath("$.plannedFocusMinutes").value(60))
        .andExpect(jsonPath("$.dailyFocusTargetMinutes").value(120))
        .andExpect(jsonPath("$.comparisonMinutes").value(60))
        .andExpect(jsonPath("$.comparisonSource").value("PLANNED_FOCUS_BLOCKS"))
        .andExpect(jsonPath("$.progressPercentage").value(50))
        .andExpect(jsonPath("$.categories.length()").value(1))
        .andExpect(jsonPath("$.categories[0].minutes").value(60))
        .andExpect(jsonPath("$.hasData").value(true));
  }

  @Test
  void returnsExplicitZeroDataAndSafeInvalidTimezoneErrors() throws Exception {
    mockMvc
        .perform(
            get("/reports/time")
                .cookie(sessionCookie)
                .param("date", "2026-08-25")
                .param("timeZone", "UTC"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.actualFocusMinutes").value(0))
        .andExpect(jsonPath("$.comparisonMinutes").isEmpty())
        .andExpect(jsonPath("$.comparisonSource").value("NONE"))
        .andExpect(jsonPath("$.progressPercentage").isEmpty())
        .andExpect(jsonPath("$.categories").isEmpty())
        .andExpect(jsonPath("$.hasData").value(false));

    mockMvc
        .perform(
            get("/reports/time")
                .cookie(sessionCookie)
                .param("date", "2026-08-25")
                .param("timeZone", "Invalid/Zone"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("timeZone"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID_TIMEZONE"));
  }

  private UUID createAccount(String prefix) {
    Instant now = Instant.now();
    return userRepository
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + "-" + UUID.randomUUID() + "@example.test"),
                    "Time Report Tester",
                    now)
                .verify(now))
        .id();
  }

  private Cookie issueSession(UUID accountId) {
    RawToken sessionToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            accountId,
            sessionToken.hash(),
            tokenGenerator.generate().hash(),
            Instant.now(),
            Optional.empty()));
    return new Cookie("lifeos_session", sessionToken.value());
  }
}
