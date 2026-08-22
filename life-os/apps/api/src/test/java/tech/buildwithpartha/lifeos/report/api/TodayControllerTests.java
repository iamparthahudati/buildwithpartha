package tech.buildwithpartha.lifeos.report.api;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;
import tech.buildwithpartha.lifeos.user.domain.UserProfileRepository;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class TodayControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;

  @Autowired
  TodayControllerTests(
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

  @BeforeEach
  void setUp() {
    userId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("today-test-" + UUID.randomUUID() + "@example.test"),
                        "Today Tester",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

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

    sessionCookie = new Cookie("lifeos_session", sessionToken.value());
  }

  @Test
  void getTodayRequiresAuthentication() throws Exception {
    mockMvc.perform(get("/today")).andExpect(status().isUnauthorized());
  }

  @Test
  void getTodayReturnsZeroSafeEmptyWidgetsAndCacheControlHeader() throws Exception {
    mockMvc
        .perform(get("/today").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", containsString("no-store")))
        .andExpect(jsonPath("$.generatedAt").isNotEmpty())
        .andExpect(jsonPath("$.userTimeZone").value("UTC"))
        .andExpect(jsonPath("$.localDate").isNotEmpty())
        // MIT widget
        .andExpect(jsonPath("$.mit.status").value("EMPTY"))
        .andExpect(jsonPath("$.mit.data").isEmpty())
        .andExpect(jsonPath("$.mit.error").isEmpty())
        // CurrentNextBlock widget
        .andExpect(jsonPath("$.currentNextBlock.status").value("EMPTY"))
        .andExpect(jsonPath("$.currentNextBlock.data").isEmpty())
        .andExpect(jsonPath("$.currentNextBlock.error").isEmpty())
        // Tasks widget
        .andExpect(jsonPath("$.tasks.status").value("EMPTY"))
        .andExpect(jsonPath("$.tasks.data.tasks").isEmpty())
        .andExpect(jsonPath("$.tasks.error").isEmpty())
        // Schedule widget
        .andExpect(jsonPath("$.schedule.status").value("EMPTY"))
        .andExpect(jsonPath("$.schedule.data.blocks").isEmpty())
        .andExpect(jsonPath("$.schedule.data.conflicts").isEmpty())
        .andExpect(jsonPath("$.schedule.error").isEmpty())
        // Overdue widget
        .andExpect(jsonPath("$.overdue.status").value("EMPTY"))
        .andExpect(jsonPath("$.overdue.data.totalCount").value(0))
        .andExpect(jsonPath("$.overdue.data.topOverdueTasks").isEmpty())
        .andExpect(jsonPath("$.overdue.error").isEmpty())
        // Focus summary widget
        .andExpect(jsonPath("$.focusSummary.status").value("EMPTY"))
        .andExpect(jsonPath("$.focusSummary.data.actualFocusMinutesToday").value(0))
        .andExpect(jsonPath("$.focusSummary.data.plannedFocusMinutesToday").value(0))
        .andExpect(jsonPath("$.focusSummary.data.activeSessionTimerSummary").isEmpty())
        .andExpect(jsonPath("$.focusSummary.data.isSessionActive").value(false))
        .andExpect(jsonPath("$.focusSummary.error").isEmpty())
        // Sprint widget
        .andExpect(jsonPath("$.sprint.status").value("EMPTY"))
        .andExpect(jsonPath("$.sprint.data").isEmpty())
        .andExpect(jsonPath("$.sprint.error").isEmpty())
        // Week widget
        .andExpect(jsonPath("$.week.status").value("EMPTY"))
        .andExpect(jsonPath("$.week.data.completedTasksCount").value(0))
        .andExpect(jsonPath("$.week.data.totalTasksCount").value(0))
        .andExpect(jsonPath("$.week.data.outcomes").isEmpty())
        .andExpect(jsonPath("$.week.error").isEmpty())
        // Active projects widget
        .andExpect(jsonPath("$.activeProjects.status").value("EMPTY"))
        .andExpect(jsonPath("$.activeProjects.data.projects").isEmpty())
        .andExpect(jsonPath("$.activeProjects.error").isEmpty())
        // Review widget
        .andExpect(jsonPath("$.review.status").value("EMPTY"))
        .andExpect(jsonPath("$.review.data.morningReviewCompleted").value(false))
        .andExpect(jsonPath("$.review.data.eveningReviewCompleted").value(false))
        .andExpect(jsonPath("$.review.data.morningReviewState").value("NOT_STARTED"))
        .andExpect(jsonPath("$.review.data.eveningReviewState").value("NOT_STARTED"))
        .andExpect(jsonPath("$.review.error").isEmpty())
        // Brain dump widget
        .andExpect(jsonPath("$.brainDump.status").value("EMPTY"))
        .andExpect(jsonPath("$.brainDump.data.unprocessedCount").value(0))
        .andExpect(jsonPath("$.brainDump.error").isEmpty())
        // Habits widget
        .andExpect(jsonPath("$.habits.status").value("EMPTY"))
        .andExpect(jsonPath("$.habits.data.habits").isEmpty())
        .andExpect(jsonPath("$.habits.error").isEmpty())
        // Metrics widget
        .andExpect(jsonPath("$.metrics.status").value("EMPTY"))
        .andExpect(jsonPath("$.metrics.data.metrics").isEmpty())
        .andExpect(jsonPath("$.metrics.error").isEmpty());
  }

  @Test
  void getTodayResolvesUserConfiguredTimeZone() throws Exception {
    UserProfile currentProfile = userProfileRepository.findByUserId(userId).orElseThrow();
    userProfileRepository.save(
        currentProfile.withUpdates(
            "Today Tester", "America/New_York", "en-US", 1, currentProfile.version()));

    mockMvc
        .perform(get("/today").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userTimeZone").value("America/New_York"))
        .andExpect(jsonPath("$.localDate").isNotEmpty());
  }
}
