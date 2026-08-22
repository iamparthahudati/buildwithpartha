package tech.buildwithpartha.lifeos.task.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
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
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class TaskQueryTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final TaskRepository taskRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;
  private UUID otherUserId;

  @Autowired
  TaskQueryTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      TaskRepository taskRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.taskRepository = taskRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @BeforeEach
  void setUp() {
    userId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("query-test-" + UUID.randomUUID() + "@example.test"),
                        "Query Tester",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

    otherUserId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("query-other-" + UUID.randomUUID() + "@example.test"),
                        "Query Other",
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
  void queryTasksWithFiltersAndSummaryCounts() throws Exception {
    Instant now = Instant.now();
    Instant pastDue = now.minusSeconds(3600);

    // Create tasks for userId
    taskRepository.save(
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            "Backend API Design",
            Optional.of("Detailed specs"),
            TaskStatus.TO_DO,
            TaskPriority.P1,
            Optional.of(pastDue), // Overdue
            60,
            0,
            0,
            Optional.of(LocalDate.now()), // MIT
            1,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            0L));

    taskRepository.save(
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            "Frontend UI Components",
            Optional.of("React views"),
            TaskStatus.IN_PROGRESS,
            TaskPriority.P2,
            Optional.empty(),
            120,
            30,
            25,
            Optional.empty(),
            2,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            0L));

    // Create task for otherUserId (should be isolated)
    taskRepository.save(
        new Task(
            UUID.randomUUID(),
            otherUserId,
            Optional.empty(),
            "Other User Private Task",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P1,
            Optional.empty(),
            0,
            0,
            0,
            Optional.empty(),
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            0L));

    // Query all active tasks for user
    mockMvc
        .perform(get("/tasks").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalItems").value(2))
        .andExpect(jsonPath("$.summary.total").value(2))
        .andExpect(jsonPath("$.summary.toDo").value(1))
        .andExpect(jsonPath("$.summary.inProgress").value(1))
        .andExpect(jsonPath("$.summary.overdue").value(1))
        .andExpect(jsonPath("$.summary.mit").value(1));

    // Text search query
    mockMvc
        .perform(get("/tasks?q=Backend").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalItems").value(1))
        .andExpect(jsonPath("$.page.items[0].title").value("Backend API Design"));

    // Status filter
    mockMvc
        .perform(get("/tasks?status=IN_PROGRESS").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalItems").value(1))
        .andExpect(jsonPath("$.page.items[0].title").value("Frontend UI Components"));

    // Overdue filter
    mockMvc
        .perform(get("/tasks?overdue=true").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalItems").value(1))
        .andExpect(jsonPath("$.page.items[0].title").value("Backend API Design"));

    // Label filter with non-matching labelId
    UUID dummyLabelId = UUID.randomUUID();
    mockMvc
        .perform(get("/tasks?labelId=" + dummyLabelId).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalItems").value(0));

    // Priority filter
    mockMvc
        .perform(get("/tasks?priority=P1").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalItems").value(1))
        .andExpect(jsonPath("$.page.items[0].title").value("Backend API Design"));

    // MIT filter
    mockMvc
        .perform(get("/tasks?isMit=true").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalItems").value(1));

    // Due dates filter
    mockMvc
        .perform(get("/tasks?dueBefore=" + now.plusSeconds(7200)).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalItems").value(1));
  }

  @Test
  void getSummaryCountsEndpoint() throws Exception {
    mockMvc
        .perform(get("/tasks/summary-counts").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(0))
        .andExpect(jsonPath("$.toDo").value(0));
  }

  @Test
  void queryTasksInvalidPaginationReturnsBadRequest() throws Exception {
    mockMvc.perform(get("/tasks?page=-1").cookie(sessionCookie)).andExpect(status().isBadRequest());

    mockMvc
        .perform(get("/tasks?size=200").cookie(sessionCookie))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(get("/tasks?sortBy=invalidField").cookie(sessionCookie))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(get("/tasks?sortDirection=INVALID").cookie(sessionCookie))
        .andExpect(status().isBadRequest());
  }
}
