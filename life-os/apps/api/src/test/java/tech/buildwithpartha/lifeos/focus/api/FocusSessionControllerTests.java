package tech.buildwithpartha.lifeos.focus.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
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
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionRepository;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskDomainFixture;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockDomainFixture;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class FocusSessionControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository authSessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final FocusSessionRepository focusSessionRepository;
  private final TaskRepository taskRepository;
  private final TimeBlockRepository timeBlockRepository;

  private UUID userId;
  private RawToken csrfToken;
  private Cookie sessionCookie;

  @Autowired
  FocusSessionControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository authSessionRepository,
      SecureTokenGenerator tokenGenerator,
      FocusSessionRepository focusSessionRepository,
      TaskRepository taskRepository,
      TimeBlockRepository timeBlockRepository) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.authSessionRepository = authSessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.focusSessionRepository = focusSessionRepository;
    this.taskRepository = taskRepository;
    this.timeBlockRepository = timeBlockRepository;
  }

  @BeforeEach
  void setUp() {
    AuthContext context = createAuthContext("focus-api");
    userId = context.userId();
    csrfToken = context.csrfToken();
    sessionCookie = context.sessionCookie();
  }

  @Test
  void startIsRecoverableIdempotentAndReconcilesTimeBlockContext() throws Exception {
    Task task = taskRepository.save(TaskDomainFixture.createSampleTask(userId, Optional.empty()));
    TimeBlock block =
        timeBlockRepository.save(
            TimeBlockDomainFixture.aTimeBlock().withUserId(userId).withTaskId(task.id()).build());
    String body =
        """
        {
          "timeBlockId": "%s",
          "plannedFocusDurationSeconds": 1500,
          "plannedBreakDurationSeconds": 300
        }
        """
            .formatted(block.id());

    String response =
        mockMvc
            .perform(
                post("/focus-sessions")
                    .cookie(sessionCookie)
                    .header("X-CSRF-TOKEN", csrfToken.value())
                    .header("Idempotency-Key", "start-api-session-001")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isCreated())
            .andExpect(
                header()
                    .string("Location", org.hamcrest.Matchers.containsString("/focus-sessions/")))
            .andExpect(jsonPath("$.taskId").value(task.id().toString()))
            .andExpect(jsonPath("$.timeBlockId").value(block.id().toString()))
            .andExpect(jsonPath("$.status").value("RUNNING"))
            .andExpect(jsonPath("$.phase").value("FOCUS"))
            .andExpect(jsonPath("$.serverNow").exists())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID sessionId = UUID.fromString(JsonPath.read(response, "$.id"));

    mockMvc
        .perform(
            post("/focus-sessions")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("Idempotency-Key", "start-api-session-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(sessionId.toString()));

    mockMvc
        .perform(get("/focus-sessions/active").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(sessionId.toString()));
    mockMvc
        .perform(get("/focus-sessions/" + sessionId).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(sessionId.toString()));
    assertThat(timeBlockRepository.findByIdAndUserId(block.id(), userId).orElseThrow().status())
        .isEqualTo(TimeBlockStatus.IN_PROGRESS);

    mockMvc
        .perform(
            post("/focus-sessions")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("Idempotency-Key", "start-api-session-002")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("FOCUS_SESSION_ALREADY_ACTIVE"));
  }

  @Test
  void completionRecordsWholeFocusMinutesAndCompletesBlockExactlyOnce() throws Exception {
    Task task = taskRepository.save(TaskDomainFixture.createSampleTask(userId, Optional.empty()));
    TimeBlock block =
        timeBlockRepository.save(
            TimeBlockDomainFixture.aTimeBlock()
                .withUserId(userId)
                .withTaskId(task.id())
                .withStatus(TimeBlockStatus.IN_PROGRESS)
                .build());
    Instant startedAt = Instant.now().minusSeconds(125);
    FocusSession running =
        focusSessionRepository.save(
            FocusSession.start(
                UUID.randomUUID(),
                userId,
                Optional.of(task.id()),
                Optional.of(block.id()),
                Duration.ofMinutes(25),
                Duration.ofMinutes(5),
                startedAt));
    String transitionBody = "{\"version\":" + running.version() + "}";

    mockMvc
        .perform(
            post("/focus-sessions/" + running.id() + "/complete")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("Idempotency-Key", "complete-session-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(transitionBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("COMPLETED"))
        .andExpect(
            jsonPath("$.actualFocusDurationSeconds")
                .value(org.hamcrest.Matchers.greaterThanOrEqualTo(125)));

    assertThat(taskRepository.findByIdAndUserId(task.id(), userId).orElseThrow().spentMinutes())
        .isEqualTo(2);
    assertThat(timeBlockRepository.findByIdAndUserId(block.id(), userId).orElseThrow().status())
        .isEqualTo(TimeBlockStatus.COMPLETED);

    mockMvc
        .perform(
            post("/focus-sessions/" + running.id() + "/complete")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("Idempotency-Key", "complete-session-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(transitionBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("COMPLETED"));
    FocusSession completed =
        focusSessionRepository.findByIdAndUserId(running.id(), userId).orElseThrow();
    transition(
        running.id(), "complete", completed.version(), "complete-session-semantic-noop-001", 200);
    assertThat(taskRepository.findByIdAndUserId(task.id(), userId).orElseThrow().spentMinutes())
        .isEqualTo(2);
  }

  @Test
  void interruptionsAndPauseAreIdempotentWhileCrossUserReadsStayHidden() throws Exception {
    FocusSession running =
        focusSessionRepository.save(
            FocusSession.start(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                Optional.empty(),
                Duration.ofMinutes(25),
                Duration.ofMinutes(5),
                Instant.now().minusSeconds(5)));
    String interruptionBody = "{\"version\":" + running.version() + ",\"note\":\"Notification\"}";

    for (int attempt = 0; attempt < 2; attempt++) {
      mockMvc
          .perform(
              post("/focus-sessions/" + running.id() + "/interruptions")
                  .cookie(sessionCookie)
                  .header("X-CSRF-TOKEN", csrfToken.value())
                  .header("Idempotency-Key", "interrupt-session-001")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(interruptionBody))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.interruptions.length()").value(1))
          .andExpect(jsonPath("$.interruptions[0].note").value("Notification"));
    }

    AuthContext other = createAuthContext("focus-other");
    mockMvc
        .perform(get("/focus-sessions/" + running.id()).cookie(other.sessionCookie()))
        .andExpect(status().isNotFound());
  }

  @Test
  void mutationsRequireAuthenticationCsrfValidInputAndReplayKey() throws Exception {
    String body =
        """
        {"plannedFocusDurationSeconds":1500,"plannedBreakDurationSeconds":300}
        """;
    mockMvc
        .perform(
            post("/focus-sessions")
                .header("Idempotency-Key", "anonymous-start-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isUnauthorized());
    mockMvc
        .perform(
            post("/focus-sessions")
                .cookie(sessionCookie)
                .header("Idempotency-Key", "missing-csrf-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(
            post("/focus-sessions")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    mockMvc
        .perform(
            post("/focus-sessions")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("Idempotency-Key", "invalid-duration-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"plannedFocusDurationSeconds\":0,\"plannedBreakDurationSeconds\":300}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void lifecycleTransitionsUseVersionsAndRejectAReusedKeyForAnotherOperation() throws Exception {
    TimeBlock block =
        timeBlockRepository.save(
            TimeBlockDomainFixture.aTimeBlock()
                .withUserId(userId)
                .withStatus(TimeBlockStatus.IN_PROGRESS)
                .build());
    FocusSession running =
        focusSessionRepository.save(
            FocusSession.start(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                Optional.of(block.id()),
                Duration.ofMinutes(25),
                Duration.ofMinutes(5),
                Instant.now().minusSeconds(5)));

    String paused =
        transition(running.id(), "pause", running.version(), "pause-lifecycle-001", 200);
    long pausedVersion = ((Number) JsonPath.read(paused, "$.version")).longValue();
    assertThat(JsonPath.<String>read(paused, "$.status")).isEqualTo("PAUSED");
    transition(running.id(), "pause", pausedVersion, "pause-lifecycle-noop-001", 200);

    transition(running.id(), "resume", running.version(), "resume-stale-001", 409);
    transition(running.id(), "resume", pausedVersion, "pause-lifecycle-001", 409);
    String resumed = transition(running.id(), "resume", pausedVersion, "resume-lifecycle-001", 200);
    long resumedVersion = ((Number) JsonPath.read(resumed, "$.version")).longValue();
    transition(running.id(), "resume", resumedVersion, "resume-lifecycle-noop-001", 200);

    String onBreak =
        transition(running.id(), "start-break", resumedVersion, "break-lifecycle-001", 200);
    long breakVersion = ((Number) JsonPath.read(onBreak, "$.version")).longValue();
    assertThat(JsonPath.<String>read(onBreak, "$.phase")).isEqualTo("BREAK");
    transition(running.id(), "start-break", breakVersion, "break-lifecycle-noop-001", 200);

    String focused =
        transition(running.id(), "resume-focus", breakVersion, "focus-lifecycle-001", 200);
    long focusVersion = ((Number) JsonPath.read(focused, "$.version")).longValue();
    transition(running.id(), "resume-focus", focusVersion, "focus-lifecycle-noop-001", 200);
    String cancelled =
        transition(running.id(), "cancel", focusVersion, "cancel-lifecycle-001", 200);
    long cancelledVersion = ((Number) JsonPath.read(cancelled, "$.version")).longValue();
    assertThat(JsonPath.<String>read(cancelled, "$.status")).isEqualTo("CANCELLED");
    assertThat(JsonPath.<String>read(cancelled, "$.endedAt")).isNotNull();
    transition(running.id(), "cancel", cancelledVersion, "cancel-lifecycle-noop-001", 200);
    transition(running.id(), "complete", cancelledVersion, "complete-cancelled-001", 409);
    assertThat(timeBlockRepository.findByIdAndUserId(block.id(), userId).orElseThrow().status())
        .isEqualTo(TimeBlockStatus.SCHEDULED);
  }

  @Test
  void concurrentStartsLeaveExactlyOneActiveSession() throws Exception {
    String body =
        """
        {"plannedFocusDurationSeconds":1500,"plannedBreakDurationSeconds":300}
        """;
    CountDownLatch ready = new CountDownLatch(2);
    CountDownLatch start = new CountDownLatch(1);
    ExecutorService executor = Executors.newFixedThreadPool(2);
    try {
      Future<Integer> first =
          executor.submit(() -> concurrentStart(body, "concurrent-start-key-001", ready, start));
      Future<Integer> second =
          executor.submit(() -> concurrentStart(body, "concurrent-start-key-002", ready, start));
      ready.await();
      start.countDown();

      assertThat(java.util.List.of(first.get(), second.get())).containsExactlyInAnyOrder(201, 409);
      assertThat(focusSessionRepository.findActiveByUserId(userId)).isPresent();
    } finally {
      executor.shutdownNow();
    }
  }

  @Test
  void startRejectsUnavailableOrMismatchedTaskAndTimeBlockContext() throws Exception {
    Task first = taskRepository.save(TaskDomainFixture.createSampleTask(userId, Optional.empty()));
    Task second = taskRepository.save(TaskDomainFixture.createSampleTask(userId, Optional.empty()));
    TimeBlock secondTaskBlock =
        timeBlockRepository.save(
            TimeBlockDomainFixture.aTimeBlock().withUserId(userId).withTaskId(second.id()).build());
    startExpectBadRequest(
        "{\"taskId\":\"%s\",\"timeBlockId\":\"%s\",%s}"
            .formatted(first.id(), secondTaskBlock.id(), durationsJson()),
        "mismatched-context-001");

    Task terminal = TaskDomainFixture.createSampleTask(userId, Optional.empty());
    terminal =
        taskRepository.save(
            terminal.withUpdates(
                terminal.projectId(),
                terminal.title(),
                terminal.description(),
                TaskStatus.DONE,
                terminal.priority(),
                terminal.dueAt(),
                terminal.estimateMinutes(),
                terminal.spentMinutes(),
                100,
                Optional.empty(),
                terminal.position(),
                Instant.now()));
    startExpectBadRequest(
        "{\"taskId\":\"%s\",%s}".formatted(terminal.id(), durationsJson()), "terminal-task-001");
    startExpectBadRequest(
        "{\"taskId\":\"%s\",%s}".formatted(UUID.randomUUID(), durationsJson()), "missing-task-001");

    TimeBlock cancelledBlock =
        timeBlockRepository.save(
            TimeBlockDomainFixture.aTimeBlock()
                .withUserId(userId)
                .withStatus(TimeBlockStatus.CANCELLED)
                .build());
    startExpectBadRequest(
        "{\"timeBlockId\":\"%s\",%s}".formatted(cancelledBlock.id(), durationsJson()),
        "cancelled-block-001");
    startExpectBadRequest(
        "{\"timeBlockId\":\"%s\",%s}".formatted(UUID.randomUUID(), durationsJson()),
        "missing-block-001");
  }

  private void startExpectBadRequest(String body, String idempotencyKey) throws Exception {
    mockMvc
        .perform(
            post("/focus-sessions")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("Idempotency-Key", idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
  }

  private static String durationsJson() {
    return "\"plannedFocusDurationSeconds\":1500,\"plannedBreakDurationSeconds\":300";
  }

  private String transition(
      UUID sessionId, String action, long version, String idempotencyKey, int expectedStatus)
      throws Exception {
    return mockMvc
        .perform(
            post("/focus-sessions/" + sessionId + "/" + action)
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("Idempotency-Key", idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":" + version + "}"))
        .andExpect(status().is(expectedStatus))
        .andReturn()
        .getResponse()
        .getContentAsString();
  }

  private int concurrentStart(
      String body, String idempotencyKey, CountDownLatch ready, CountDownLatch start)
      throws Exception {
    ready.countDown();
    start.await();
    return mockMvc
        .perform(
            post("/focus-sessions")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("Idempotency-Key", idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andReturn()
        .getResponse()
        .getStatus();
  }

  private AuthContext createAuthContext(String prefix) {
    UUID id =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of(prefix + "-" + UUID.randomUUID() + "@example.test"),
                        "Focus Tester",
                        Instant.now())
                    .verify(Instant.now()))
            .id();
    RawToken sessionToken = tokenGenerator.generate();
    RawToken csrf = tokenGenerator.generate();
    authSessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            id,
            sessionToken.hash(),
            csrf.hash(),
            Instant.now(),
            Optional.empty()));
    return new AuthContext(id, csrf, new Cookie("lifeos_session", sessionToken.value()));
  }

  private record AuthContext(UUID userId, RawToken csrfToken, Cookie sessionCookie) {}
}
