package tech.buildwithpartha.lifeos.common.idempotency.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import tech.buildwithpartha.lifeos.common.idempotency.infrastructure.IdempotencyRecordJpaRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskQuery;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class IdempotencyIntegrationTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final TaskRepository taskRepository;
  private final IdempotencyRecordJpaRepository idempotencyRecordJpaRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;

  private UUID userBId;
  private Cookie userBCookie;
  private RawToken userBCsrfToken;

  @Autowired
  IdempotencyIntegrationTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      TaskRepository taskRepository,
      IdempotencyRecordJpaRepository idempotencyRecordJpaRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.taskRepository = taskRepository;
    this.idempotencyRecordJpaRepository = idempotencyRecordJpaRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @BeforeEach
  void setUp() {
    idempotencyRecordJpaRepository.deleteAll();

    userId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("idempotency-user-" + UUID.randomUUID() + "@example.test"),
                        "Idempotency User",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

    userBId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of(
                            "idempotency-user-b-" + UUID.randomUUID() + "@example.test"),
                        "Idempotency User B",
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

    RawToken userBSessionToken = tokenGenerator.generate();
    userBCsrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userBId,
            userBSessionToken.hash(),
            userBCsrfToken.hash(),
            Instant.now(),
            Optional.empty()));
    userBCookie = new Cookie("lifeos_session", userBSessionToken.value());
  }

  @Test
  @DisplayName("Replays canonical response on repeated task creation with same Idempotency-Key")
  void replaysTaskCreation() throws Exception {
    String key = "create-task-key-001";
    String body = "{\"title\":\"Idempotent Task Title\"}";

    String firstResponseStr =
        mockMvc
            .perform(
                post("/tasks")
                    .cookie(sessionCookie)
                    .header("X-CSRF-TOKEN", csrfToken.value())
                    .header("Idempotency-Key", key)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("Idempotent Task Title"))
            .andReturn()
            .getResponse()
            .getContentAsString();

    String secondResponseStr =
        mockMvc
            .perform(
                post("/tasks")
                    .cookie(sessionCookie)
                    .header("X-CSRF-TOKEN", csrfToken.value())
                    .header("Idempotency-Key", key)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("Idempotent Task Title"))
            .andReturn()
            .getResponse()
            .getContentAsString();

    assertThat(secondResponseStr).isEqualTo(firstResponseStr);

    var userTasks =
        taskRepository.queryTasks(
            new TaskQuery(
                userId,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                0,
                50,
                "createdAt",
                "DESC"));
    assertThat(userTasks.totalItems()).isEqualTo(1);
  }

  @Test
  @DisplayName("Returns 409 IDEMPOTENCY_KEY_REUSED when reusing key for different operation")
  void rejectsKeyReuseAcrossOperations() throws Exception {
    String key = "shared-key-001";

    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Task 1\"}"))
        .andExpect(status().isCreated());

    mockMvc
        .perform(
            post("/notes")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"title\":\"Note 1\",\"body\":\"Content\",\"labelIds\":[],\"links\":[]}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
  }

  @Test
  @DisplayName("Returns 400 validation error when Idempotency-Key format is invalid")
  void rejectsInvalidKeyFormat() throws Exception {
    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("Idempotency-Key", "bad key format!")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Task 1\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
  }

  @Test
  @DisplayName("Scopes idempotency keys per user so different users do not conflict")
  void isolatesKeysPerUser() throws Exception {
    String key = "user-scoped-key-001";

    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"User A Task\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.title").value("User A Task"));

    mockMvc
        .perform(
            post("/tasks")
                .cookie(userBCookie)
                .header("X-CSRF-TOKEN", userBCsrfToken.value())
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"User B Task\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.title").value("User B Task"));
  }
}
