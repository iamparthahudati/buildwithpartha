package tech.buildwithpartha.lifeos.task.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class MitControllerTests {

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
  MitControllerTests(
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
                        EmailAddress.of("mit-test-" + UUID.randomUUID() + "@example.test"),
                        "MIT Tester",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

    otherUserId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("mit-other-" + UUID.randomUUID() + "@example.test"),
                        "MIT Other",
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
  void setAndGetMitForDate() throws Exception {
    Instant now = Instant.now();
    LocalDate date = LocalDate.now();

    Task task =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Critical Core Task",
                Optional.empty(),
                TaskStatus.TO_DO,
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

    // GET /tasks/mit initially returns 204 No Content
    mockMvc
        .perform(get("/tasks/mit?date=" + date).cookie(sessionCookie))
        .andExpect(status().isNoContent());

    // Set MIT
    String setBody = "{\"date\": \"" + date + "\"}";
    mockMvc
        .perform(
            post("/tasks/" + task.id() + "/mit")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(setBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.mitDate").value(date.toString()));

    // GET /tasks/mit now returns the task
    mockMvc
        .perform(get("/tasks/mit?date=" + date).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(task.id().toString()))
        .andExpect(jsonPath("$.title").value("Critical Core Task"));
  }

  @Test
  void atomicReplacementOfMitPerDate() throws Exception {
    Instant now = Instant.now();
    LocalDate date = LocalDate.now();

    Task taskA =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Task A",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P1,
                Optional.empty(),
                0,
                0,
                0,
                Optional.of(date),
                0,
                Optional.empty(),
                Optional.empty(),
                now,
                now,
                List.of(),
                0L));

    Task taskB =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Task B",
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

    // Setting Task B as MIT for date automatically clears Task A's MIT
    String setBody = "{\"date\": \"" + date + "\"}";
    mockMvc
        .perform(
            post("/tasks/" + taskB.id() + "/mit")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(setBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(taskB.id().toString()));

    Task reloadedA = taskRepository.findById(taskA.id()).orElseThrow();
    assertThat(reloadedA.mitDate()).isEmpty();
  }

  @Test
  void clearMitRemovesDesignation() throws Exception {
    Instant now = Instant.now();
    LocalDate date = LocalDate.now();

    Task task =
        taskRepository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "Task to clear MIT",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P2,
                Optional.empty(),
                0,
                0,
                0,
                Optional.of(date),
                0,
                Optional.empty(),
                Optional.empty(),
                now,
                now,
                List.of(),
                0L));

    mockMvc
        .perform(
            delete("/tasks/" + task.id() + "/mit")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.mitDate").isEmpty());
  }

  @Test
  void mitOperationsEnforceCrossUserIsolation() throws Exception {
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

    mockMvc
        .perform(
            post("/tasks/" + otherTask.id() + "/mit")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\": \"" + LocalDate.now() + "\"}"))
        .andExpect(status().isNotFound());
  }
}
