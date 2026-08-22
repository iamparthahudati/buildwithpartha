package tech.buildwithpartha.lifeos.task.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
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
class SubtaskControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final TaskRepository taskRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;
  private UUID otherUserId;

  @Autowired
  SubtaskControllerTests(
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
                        EmailAddress.of("subtask-test-" + UUID.randomUUID() + "@example.test"),
                        "Subtask Tester",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

    otherUserId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("subtask-other-" + UUID.randomUUID() + "@example.test"),
                        "Subtask Other",
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
  }

  @Test
  void addSubtaskRecalculatesProgress() throws Exception {
    Instant now = Instant.now();
    Task parentTask =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Parent Task",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P2,
                Optional.empty(),
                60,
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

    String body1 = "{\"title\": \"Subtask Step 1\"}";
    mockMvc
        .perform(
            post("/tasks/" + parentTask.id() + "/subtasks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body1))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.subtasks.length()").value(1))
        .andExpect(jsonPath("$.subtasks[0].title").value("Subtask Step 1"))
        .andExpect(jsonPath("$.progress").value(0))
        .andExpect(jsonPath("$.subtaskCount").value(1))
        .andExpect(jsonPath("$.completedSubtaskCount").value(0));

    String body2 = "{\"title\": \"Subtask Step 2\"}";
    mockMvc
        .perform(
            post("/tasks/" + parentTask.id() + "/subtasks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body2))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.subtasks.length()").value(2))
        .andExpect(jsonPath("$.subtaskCount").value(2));
  }

  @Test
  void toggleSubtaskCalculatesTaskProgress() throws Exception {
    Instant now = Instant.now();
    Task parentTask =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Parent Task with Subtasks",
                Optional.empty(),
                TaskStatus.IN_PROGRESS,
                TaskPriority.P1,
                Optional.empty(),
                60,
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

    // Add 2 subtasks
    mockMvc.perform(
        post("/tasks/" + parentTask.id() + "/subtasks")
            .cookie(sessionCookie)
            .header("X-CSRF-TOKEN", csrfToken.value())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\": \"Item 1\"}"));

    mockMvc.perform(
        post("/tasks/" + parentTask.id() + "/subtasks")
            .cookie(sessionCookie)
            .header("X-CSRF-TOKEN", csrfToken.value())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\": \"Item 2\"}"));

    Task reloaded = taskRepository.findById(parentTask.id()).orElseThrow();
    UUID sub1Id = reloaded.subtasks().get(0).id();
    UUID sub2Id = reloaded.subtasks().get(1).id();

    // Toggle 1st subtask -> 1 of 2 completed = 50%
    mockMvc
        .perform(
            patch("/tasks/" + parentTask.id() + "/subtasks/" + sub1Id + "/toggle")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.progress").value(50))
        .andExpect(jsonPath("$.completedSubtaskCount").value(1));

    // Toggle 2nd subtask -> 2 of 2 completed = 100%
    mockMvc
        .perform(
            patch("/tasks/" + parentTask.id() + "/subtasks/" + sub2Id + "/toggle")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.progress").value(100))
        .andExpect(jsonPath("$.completedSubtaskCount").value(2));
  }

  @Test
  void updateDeleteAndReorderSubtasks() throws Exception {
    Instant now = Instant.now();
    Task parentTask =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Subtask Reorder Task",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P3,
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

    mockMvc.perform(
        post("/tasks/" + parentTask.id() + "/subtasks")
            .cookie(sessionCookie)
            .header("X-CSRF-TOKEN", csrfToken.value())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\": \"First\"}"));

    mockMvc.perform(
        post("/tasks/" + parentTask.id() + "/subtasks")
            .cookie(sessionCookie)
            .header("X-CSRF-TOKEN", csrfToken.value())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\": \"Second\"}"));

    Task reloaded = taskRepository.findById(parentTask.id()).orElseThrow();
    UUID sub1Id = reloaded.subtasks().get(0).id();
    UUID sub2Id = reloaded.subtasks().get(1).id();

    // Reorder: put sub2 first
    String reorderBody = "{\"subtaskIds\": [\"" + sub2Id + "\", \"" + sub1Id + "\"]}";
    mockMvc
        .perform(
            put("/tasks/" + parentTask.id() + "/subtasks/reorder")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(reorderBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.subtasks[0].id").value(sub2Id.toString()))
        .andExpect(jsonPath("$.subtasks[1].id").value(sub1Id.toString()));

    // Update subtask title
    String updateBody = "{\"title\": \"Updated First Title\"}";
    mockMvc
        .perform(
            put("/tasks/" + parentTask.id() + "/subtasks/" + sub1Id)
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody))
        .andExpect(status().isOk());

    // Delete sub2
    mockMvc
        .perform(
            delete("/tasks/" + parentTask.id() + "/subtasks/" + sub2Id)
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.subtasks.length()").value(1));
  }

  @Test
  void subtaskOperationsEnforceCrossUserIsolation() throws Exception {
    Instant now = Instant.now();
    Task otherTask =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                otherUserId,
                Optional.empty(),
                "Other User Task",
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

    mockMvc
        .perform(
            post("/tasks/" + otherTask.id() + "/subtasks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\": \"Unauthorized Subtask\"}"))
        .andExpect(status().isNotFound());
  }
}
