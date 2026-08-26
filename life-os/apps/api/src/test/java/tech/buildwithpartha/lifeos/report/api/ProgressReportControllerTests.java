package tech.buildwithpartha.lifeos.report.api;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;
import tech.buildwithpartha.lifeos.sprint.domain.Review;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewRepository;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class ProgressReportControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final TaskRepository taskRepository;
  private final ProjectRepository projectRepository;
  private final GoalRepository goalRepository;
  private final ReviewRepository reviewRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;

  @Autowired
  ProgressReportControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      TaskRepository taskRepository,
      ProjectRepository projectRepository,
      GoalRepository goalRepository,
      ReviewRepository reviewRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.taskRepository = taskRepository;
    this.projectRepository = projectRepository;
    this.goalRepository = goalRepository;
    this.reviewRepository = reviewRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @BeforeEach
  void setUp() {
    userId = createAccount("progress-report-owner");
    sessionCookie = issueSession(userId);
  }

  @Test
  void requiresAuthentication() throws Exception {
    mockMvc
        .perform(get("/reports/progress").param("timeZone", "UTC"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void returnsAggregatedProgressReportWithAccessibleSummaryText() throws Exception {
    Instant now = Instant.now();
    LocalDate today = LocalDate.now();
    LocalDate startDate = today.minusDays(6);

    // Create a task
    Task task =
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            "Complete aggregation spec",
            Optional.empty(),
            TaskStatus.DONE,
            TaskPriority.P1,
            Optional.of(now),
            60,
            60,
            100,
            Optional.empty(),
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            Set.of(),
            0L);
    taskRepository.save(task);

    // Create a project
    Project project =
        new Project(
            UUID.randomUUID(),
            userId,
            "Analytics System",
            Optional.of("Metrics engine"),
            ProjectStatus.ACTIVE,
            ProjectPriority.P1,
            ProjectHealth.ON_TRACK,
            Optional.of("#000000"),
            Optional.of("bar-chart"),
            Optional.of(startDate),
            Optional.of(today.plusDays(30)),
            Optional.of(1200),
            Optional.empty(),
            now,
            now,
            Set.of(),
            0L);
    projectRepository.save(project);

    // Create a goal
    Goal goal =
        new Goal(
            UUID.randomUUID(),
            userId,
            "Ship Epic 11",
            Optional.empty(),
            "Engineering",
            GoalProgressType.PERCENTAGE,
            Optional.of(BigDecimal.valueOf(100)),
            BigDecimal.valueOf(75),
            Optional.of("%"),
            Optional.of(today.plusDays(10)),
            GoalStatus.ACTIVE,
            CheckInCadence.WEEKLY,
            false,
            now,
            now,
            0L);
    goalRepository.save(goal);

    // Create a review
    Review review =
        Review.createDraft(
                UUID.randomUUID(),
                userId,
                ReviewType.DAILY_MORNING,
                today.toString(),
                today,
                today,
                "UTC",
                List.of(),
                List.of(),
                now)
            .skipReview("Not needed", now);
    reviewRepository.save(review);

    mockMvc
        .perform(
            get("/reports/progress")
                .cookie(sessionCookie)
                .param("startDate", startDate.toString())
                .param("endDate", today.toString())
                .param("timeZone", "UTC"))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", containsString("no-store")))
        .andExpect(jsonPath("$.metricDictionaryVersion").value("1.0.0"))
        .andExpect(jsonPath("$.timeZone").value("UTC"))
        .andExpect(jsonPath("$.startDate").value(startDate.toString()))
        .andExpect(jsonPath("$.endDate").value(today.toString()))
        .andExpect(jsonPath("$.taskProgress.totalCount").value(1))
        .andExpect(jsonPath("$.taskProgress.completedCount").value(1))
        .andExpect(jsonPath("$.taskProgress.completionRatePercentage").value(100.0))
        .andExpect(jsonPath("$.projectProgress.totalCount").value(1))
        .andExpect(jsonPath("$.goalProgress.totalCount").value(1))
        .andExpect(jsonPath("$.habitProgress.totalCount").value(0))
        .andExpect(jsonPath("$.summaryText", containsString("Progress summary from")));
  }

  @Test
  void validatesInvalidTimezone() throws Exception {
    mockMvc
        .perform(get("/reports/progress").cookie(sessionCookie).param("timeZone", "Invalid/Zone"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("timeZone"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID_TIMEZONE"));
  }

  @Test
  void validatesInvalidDateRange() throws Exception {
    mockMvc
        .perform(
            get("/reports/progress")
                .cookie(sessionCookie)
                .param("startDate", "2026-08-25")
                .param("endDate", "2026-08-20")
                .param("timeZone", "UTC"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("startDate"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID_DATE_RANGE"));
  }

  @Test
  void validatesMaximumDateRangeExceeded() throws Exception {
    mockMvc
        .perform(
            get("/reports/progress")
                .cookie(sessionCookie)
                .param("startDate", "2025-01-01")
                .param("endDate", "2026-08-25")
                .param("timeZone", "UTC"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("startDate"))
        .andExpect(jsonPath("$.errors[0].code").value("RANGE_EXCEEDS_MAXIMUM_BOUND"));
  }

  @Test
  void preservesCrossUserIsolation() throws Exception {
    UUID otherUser = createAccount("progress-report-other");
    Instant now = Instant.now();

    // Create a task for another user
    taskRepository.save(
        new Task(
            UUID.randomUUID(),
            otherUser,
            Optional.empty(),
            "Other user task",
            Optional.empty(),
            TaskStatus.DONE,
            TaskPriority.P1,
            Optional.of(now),
            30,
            30,
            100,
            Optional.empty(),
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            Set.of(),
            0L));

    mockMvc
        .perform(get("/reports/progress").cookie(sessionCookie).param("timeZone", "UTC"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.taskProgress.totalCount").value(0))
        .andExpect(jsonPath("$.projectProgress.totalCount").value(0))
        .andExpect(jsonPath("$.goalProgress.totalCount").value(0));
  }

  private UUID createAccount(String prefix) {
    Instant now = Instant.now();
    return userRepository
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + "-" + UUID.randomUUID() + "@example.test"),
                    "Progress Aggregation Tester",
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
