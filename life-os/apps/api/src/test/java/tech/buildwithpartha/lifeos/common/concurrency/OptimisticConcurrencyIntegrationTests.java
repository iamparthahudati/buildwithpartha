package tech.buildwithpartha.lifeos.common.concurrency;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
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
import tech.buildwithpartha.lifeos.task.application.TaskService;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class OptimisticConcurrencyIntegrationTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final TaskRepository taskRepository;
  private final TaskService taskService;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;
  private Task testTask;

  @Autowired
  OptimisticConcurrencyIntegrationTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      TaskRepository taskRepository,
      TaskService taskService,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.taskRepository = taskRepository;
    this.taskService = taskService;
    this.tokenGenerator = tokenGenerator;
  }

  @BeforeEach
  void setUp() {
    userId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("concurrency-" + UUID.randomUUID() + "@example.test"),
                        "Concurrency User",
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

    testTask =
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            "Initial Title",
            Optional.of("Description"),
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
            Instant.now(),
            Instant.now(),
            List.of(),
            Set.of(),
            0L);
    testTask = taskRepository.save(testTask);
  }

  @Test
  @DisplayName("GET /tasks/{id} returns 200 OK with ETag header containing version")
  void getTask_returnsETagHeader() throws Exception {
    mockMvc
        .perform(get("/tasks/{id}", testTask.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"0\""))
        .andExpect(jsonPath("$.title").value("Initial Title"));
  }

  @Test
  @DisplayName("PUT /tasks/{id} with matching If-Match header succeeds and updates ETag")
  void updateTask_withMatchingIfMatch_succeeds() throws Exception {
    String payload =
        """
        {
          "title": "Updated Title",
          "status": "IN_PROGRESS",
          "priority": "P1",
          "estimateMinutes": 45,
          "spentMinutes": 10,
          "progress": 20,
          "position": 0,
          "labelIds": [],
          "version": 0
        }
        """;

    mockMvc
        .perform(
            put("/tasks/{id}", testTask.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header(HttpHeaders.IF_MATCH, "\"0\"")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"1\""))
        .andExpect(jsonPath("$.title").value("Updated Title"))
        .andExpect(jsonPath("$.version").value(1));
  }

  @Test
  @DisplayName("PUT /tasks/{id} with mismatching If-Match header returns 412 Precondition Failed")
  void updateTask_withMismatchingIfMatch_returns412PreconditionFailed() throws Exception {
    String payload =
        """
        {
          "title": "Stale Update",
          "status": "TO_DO",
          "priority": "P2",
          "version": 0
        }
        """;

    mockMvc
        .perform(
            put("/tasks/{id}", testTask.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header(HttpHeaders.IF_MATCH, "\"99\"")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isPreconditionFailed())
        .andExpect(jsonPath("$.status").value(412))
        .andExpect(jsonPath("$.code").value("PRECONDITION_FAILED"))
        .andExpect(jsonPath("$.title").value("Precondition Failed"));
  }

  @Test
  @DisplayName("PUT /tasks/{id} with stale payload version returns 409 Conflict")
  void updateTask_withStalePayloadVersion_returns409Conflict() throws Exception {
    // Increment version in DB to 1
    taskService.changeStatus(userId, testTask.id(), TaskStatus.IN_PROGRESS, 0L);

    String stalePayload =
        """
        {
          "title": "Stale Payload Update",
          "status": "DONE",
          "priority": "P3",
          "version": 0
        }
        """;

    mockMvc
        .perform(
            put("/tasks/{id}", testTask.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(stalePayload))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409))
        .andExpect(jsonPath("$.code").value("CONCURRENCY_CONFLICT"))
        .andExpect(jsonPath("$.title").value("Conflict"));
  }
}
