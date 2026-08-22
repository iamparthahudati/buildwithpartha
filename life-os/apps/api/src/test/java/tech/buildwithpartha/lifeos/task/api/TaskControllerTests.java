package tech.buildwithpartha.lifeos.task.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class TaskControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final TaskRepository taskRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private RawToken sessionToken;
  private RawToken csrfToken;
  private Cookie sessionCookie;
  private UUID otherUserId;

  @Autowired
  TaskControllerTests(
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
                        EmailAddress.of("task-test-" + UUID.randomUUID() + "@example.test"),
                        "Task Tester",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

    otherUserId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("task-other-" + UUID.randomUUID() + "@example.test"),
                        "Task Other",
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
  void createTaskSuccess() throws Exception {
    String body =
        """
        {
          "title": "Complete backend task CRUD",
          "description": "Task API implementation details",
          "priority": "P1",
          "status": "TO_DO",
          "estimateMinutes": 60
        }
        """;

    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.title").value("Complete backend task CRUD"))
        .andExpect(jsonPath("$.priority").value("P1"))
        .andExpect(jsonPath("$.status").value("TO_DO"))
        .andExpect(jsonPath("$.estimateMinutes").value(60))
        .andExpect(jsonPath("$.archived").value(false))
        .andExpect(jsonPath("$.deleted").value(false));
  }

  @Test
  void createTaskWithFullFields() throws Exception {
    String body =
        """
        {
          "title": "Task with all optional fields",
          "description": "Comprehensive details",
          "status": "TO_DO",
          "priority": "P2",
          "dueAt": "2026-12-31T23:59:59Z",
          "estimateMinutes": 120,
          "spentMinutes": 30,
          "progress": 25,
          "mitDate": "2026-12-31",
          "position": 5,
          "labelIds": []
        }
        """;

    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.title").value("Task with all optional fields"))
        .andExpect(jsonPath("$.description").value("Comprehensive details"))
        .andExpect(jsonPath("$.estimateMinutes").value(120))
        .andExpect(jsonPath("$.spentMinutes").value(30))
        .andExpect(jsonPath("$.progress").value(25))
        .andExpect(jsonPath("$.mitDate").value("2026-12-31"))
        .andExpect(jsonPath("$.position").value(5));
  }

  @Test
  void createTaskFailsWhenTitleIsBlank() throws Exception {
    String body =
        """
        {
          "title": "   ",
          "priority": "P2"
        }
        """;

    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest());
  }

  @Test
  void getTaskSuccessAndCrossUserIsolation() throws Exception {
    Instant now = Instant.now();
    Task myTask =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "My Task",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P2,
                Optional.empty(),
                30,
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

    Task otherTask =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                otherUserId,
                Optional.empty(),
                "Other Task",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P2,
                Optional.empty(),
                30,
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

    mockMvc
        .perform(get("/tasks/" + myTask.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("My Task"));

    mockMvc
        .perform(get("/tasks/" + otherTask.id()).cookie(sessionCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  void updateTaskSuccessAndVersionConflict() throws Exception {
    Instant now = Instant.now();
    Task task =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Initial Title",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P3,
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

    String updateBody =
        """
        {
          "title": "Updated Title",
          "status": "IN_PROGRESS",
          "priority": "P1",
          "version": 0
        }
        """;

    mockMvc
        .perform(
            put("/tasks/" + task.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Updated Title"))
        .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
        .andExpect(jsonPath("$.priority").value("P1"));

    // Updating with outdated version (0 instead of 1) returns 409 Conflict
    mockMvc
        .perform(
            put("/tasks/" + task.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody))
        .andExpect(status().isConflict());
  }

  @Test
  void statusTransitionAndCompleteTask() throws Exception {
    Instant now = Instant.now();
    Task task =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Task to Complete",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P2,
                Optional.empty(),
                0,
                0,
                0,
                Optional.of(LocalDate.now()),
                0,
                Optional.empty(),
                Optional.empty(),
                now,
                now,
                List.of(),
                0L));

    String completeBody =
        """
        {
          "version": 0
        }
        """;

    mockMvc
        .perform(
            post("/tasks/" + task.id() + "/complete")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DONE"))
        .andExpect(jsonPath("$.progress").value(100))
        .andExpect(jsonPath("$.mitDate").isEmpty());
  }

  @Test
  void archiveRestoreAndDeleteTask() throws Exception {
    Instant now = Instant.now();
    Task task =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Task Lifecycle",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P3,
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

    String versionBody = "{\"version\": 0}";

    // Archive
    mockMvc
        .perform(
            post("/tasks/" + task.id() + "/archive")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(versionBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archived").value(true));

    // Restore
    String restoredVersionBody = "{\"version\": 1}";
    mockMvc
        .perform(
            post("/tasks/" + task.id() + "/restore")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(restoredVersionBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archived").value(false));

    // Delete
    mockMvc
        .perform(
            delete("/tasks/" + task.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());

    // Subsequent GET returns 404
    mockMvc
        .perform(get("/tasks/" + task.id()).cookie(sessionCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  void duplicateTaskSuccess() throws Exception {
    Instant now = Instant.now();
    Task task =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Original Task",
                Optional.empty(),
                TaskStatus.IN_PROGRESS,
                TaskPriority.P1,
                Optional.empty(),
                60,
                15,
                25,
                Optional.empty(),
                0,
                Optional.empty(),
                Optional.empty(),
                now,
                now,
                List.of(),
                0L));

    mockMvc
        .perform(
            post("/tasks/" + task.id() + "/duplicate")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.title").value("Copy of Original Task"))
        .andExpect(jsonPath("$.status").value("TO_DO"))
        .andExpect(jsonPath("$.progress").value(0))
        .andExpect(jsonPath("$.priority").value("P1"));

    // Duplicate with custom title
    String duplicateBody = "{\"newTitle\": \"Custom Copy Title\"}";
    mockMvc
        .perform(
            post("/tasks/" + task.id() + "/duplicate")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(duplicateBody))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.title").value("Custom Copy Title"));
  }

  @Test
  void cancelTaskAndPatchStatus() throws Exception {
    Instant now = Instant.now();
    Task task =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Task to Cancel",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P2,
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

    // Cancel via POST /tasks/{id}/cancel
    mockMvc
        .perform(
            post("/tasks/" + task.id() + "/cancel")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\": 0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CANCELLED"));

    // Patch status back to IN_PROGRESS
    mockMvc
        .perform(
            patch("/tasks/" + task.id() + "/status")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"IN_PROGRESS\", \"version\": 1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
  }

  @Test
  void idempotentArchiveAndRestore() throws Exception {
    Instant now = Instant.now();
    Task task =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Idempotent Task",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P3,
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

    // Restore when already restored (not archived) returns unchanged task
    mockMvc
        .perform(
            post("/tasks/" + task.id() + "/restore")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\": 0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archived").value(false));

    // Archive first time
    mockMvc
        .perform(
            post("/tasks/" + task.id() + "/archive")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\": 0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archived").value(true));

    // Archive second time (already archived) returns unchanged task
    mockMvc
        .perform(
            post("/tasks/" + task.id() + "/archive")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\": 1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archived").value(true));
  }

  @Test
  void invalidStatusOrPriorityReturnsBadRequest() throws Exception {
    String invalidStatusBody = "{\"title\": \"Task\", \"status\": \"INVALID_STATUS\"}";
    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidStatusBody))
        .andExpect(status().isBadRequest());

    String invalidPriorityBody = "{\"title\": \"Task\", \"priority\": \"INVALID_PRIORITY\"}";
    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidPriorityBody))
        .andExpect(status().isBadRequest());
  }

  @Test
  void taskDependencyEndpointsWork() throws Exception {
    Task taskA =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Blocker Task A",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P2,
                Optional.empty(),
                0,
                0,
                0,
                Optional.empty(),
                0,
                Optional.empty(),
                Optional.empty(),
                Instant.now(),
                Instant.now(),
                List.of(),
                0));

    Task taskB =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Blocked Task B",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P2,
                Optional.empty(),
                0,
                0,
                0,
                Optional.empty(),
                0,
                Optional.empty(),
                Optional.empty(),
                Instant.now(),
                Instant.now(),
                List.of(),
                0));

    // GET empty dependencies
    mockMvc
        .perform(get("/tasks/" + taskB.id() + "/dependencies").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.isBlocked").value(false))
        .andExpect(jsonPath("$.blockers").isEmpty());

    // POST add dependency (A blocks B)
    String addBody = "{\"targetTaskId\": \"" + taskA.id() + "\", \"type\": \"BLOCKER\"}";
    mockMvc
        .perform(
            post("/tasks/" + taskB.id() + "/dependencies")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(addBody))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.isBlocked").value(true))
        .andExpect(jsonPath("$.blockers[0].id").value(taskA.id().toString()));

    // DELETE remove dependency (with type parameter)
    mockMvc
        .perform(
            delete("/tasks/" + taskB.id() + "/dependencies/" + taskA.id() + "?type=BLOCKER")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.isBlocked").value(false));
  }
}
