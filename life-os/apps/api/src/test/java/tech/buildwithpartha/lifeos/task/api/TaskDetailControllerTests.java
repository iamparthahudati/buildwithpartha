package tech.buildwithpartha.lifeos.task.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.persistence.EntityManagerFactory;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
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
import tech.buildwithpartha.lifeos.task.application.CreateTaskCommand;
import tech.buildwithpartha.lifeos.task.application.TaskService;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskDependency;
import tech.buildwithpartha.lifeos.task.domain.TaskDependencyRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskDependencyType;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class TaskDetailControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final TaskService taskService;
  private final TaskDependencyRepository taskDependencyRepository;
  private final EntityManagerFactory entityManagerFactory;

  private UUID userId;
  private UUID otherUserId;
  private Cookie sessionCookie;

  @Autowired
  TaskDetailControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator,
      TaskService taskService,
      TaskDependencyRepository taskDependencyRepository,
      EntityManagerFactory entityManagerFactory) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.taskService = taskService;
    this.taskDependencyRepository = taskDependencyRepository;
    this.entityManagerFactory = entityManagerFactory;
  }

  @BeforeEach
  void setUp() {
    userId = createUser("detail-owner");
    otherUserId = createUser("detail-other");

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
  void returnsVersionedTaskMetadataSubtasksDependenciesAndRelatedCounts() throws Exception {
    Task task = createTask(userId, "Aggregate Task", TaskStatus.BLOCKED, 37);
    taskService.addSubtask(userId, task.id(), "First Subtask", 0);
    taskService.addSubtask(userId, task.id(), "Second Subtask", 1);

    Task openBlocker = createTask(userId, "Open Blocker", TaskStatus.IN_PROGRESS, 0);
    Task resolvedBlocker = createTask(userId, "Resolved Blocker", TaskStatus.DONE, 0);
    Task dependent = createTask(userId, "Dependent Task", TaskStatus.TO_DO, 0);
    taskService.addDependency(userId, task.id(), openBlocker.id(), TaskDependencyType.BLOCKER);
    taskService.addDependency(userId, task.id(), resolvedBlocker.id(), TaskDependencyType.BLOCKER);
    taskService.addDependency(userId, task.id(), dependent.id(), TaskDependencyType.DEPENDENT);

    Task current = taskService.getTask(userId, task.id());

    mockMvc
        .perform(get("/tasks/" + task.id() + "/detail").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.task.id").value(task.id().toString()))
        .andExpect(jsonPath("$.task.title").value("Aggregate Task"))
        .andExpect(jsonPath("$.task.spentMinutes").value(37))
        .andExpect(jsonPath("$.task.subtasks.length()").value(2))
        .andExpect(jsonPath("$.task.subtasks[0].title").value("First Subtask"))
        .andExpect(jsonPath("$.task.subtaskCount").value(2))
        .andExpect(jsonPath("$.dependencies.blockers.length()").value(2))
        .andExpect(jsonPath("$.dependencies.dependents.length()").value(1))
        .andExpect(jsonPath("$.dependencies.isBlocked").value(true))
        .andExpect(jsonPath("$.dependencies.unresolvedBlockerCount").value(1))
        .andExpect(jsonPath("$.counts.linkedTimeBlockCount").value(0))
        .andExpect(jsonPath("$.counts.focusSessionCount").value(0))
        .andExpect(jsonPath("$.counts.commentCount").value(0))
        .andExpect(jsonPath("$.counts.attachmentCount").value(0))
        .andExpect(jsonPath("$.counts.activityEventCount").value(0))
        .andExpect(jsonPath("$.version").value(current.version()))
        .andExpect(jsonPath("$.task.version").value(current.version()));
  }

  @Test
  void hidesCrossUserAndMissingTasksBehindTheSameNotFoundResponse() throws Exception {
    Task otherTask = createTask(otherUserId, "Private Other Task", TaskStatus.TO_DO, 0);

    mockMvc
        .perform(get("/tasks/" + otherTask.id() + "/detail").cookie(sessionCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

    mockMvc
        .perform(get("/tasks/" + UUID.randomUUID() + "/detail").cookie(sessionCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  @Test
  void requiresAnAuthenticatedSession() throws Exception {
    Task task = createTask(userId, "Protected Task", TaskStatus.TO_DO, 0);

    mockMvc.perform(get("/tasks/" + task.id() + "/detail")).andExpect(status().isUnauthorized());
  }

  @Test
  void doesNotProjectACrossUserDependencyEvenIfAnInvalidEdgeExists() throws Exception {
    Task ownedTask = createTask(userId, "Owned Task", TaskStatus.TO_DO, 0);
    Task otherTask = createTask(otherUserId, "Private Blocker", TaskStatus.TO_DO, 0);
    taskDependencyRepository.save(
        new TaskDependency(otherTask.id(), ownedTask.id(), Instant.now()));

    mockMvc
        .perform(get("/tasks/" + ownedTask.id() + "/detail").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.dependencies.blockers").isEmpty())
        .andExpect(jsonPath("$.dependencies.unresolvedBlockerCount").value(0))
        .andExpect(jsonPath("$.dependencies.isBlocked").value(false));
  }

  @Test
  void keepsSelectStatementCountConstantAsDependenciesGrow() throws Exception {
    Task emptyTask = createTask(userId, "No Dependencies", TaskStatus.TO_DO, 0);
    Task denseTask = createTask(userId, "Many Dependencies", TaskStatus.BLOCKED, 0);
    for (int index = 0; index < 12; index++) {
      Task blocker = createTask(userId, "Blocker " + index, TaskStatus.TO_DO, 0);
      Task dependent = createTask(userId, "Dependent " + index, TaskStatus.TO_DO, 0);
      taskService.addDependency(userId, denseTask.id(), blocker.id(), TaskDependencyType.BLOCKER);
      taskService.addDependency(
          userId, denseTask.id(), dependent.id(), TaskDependencyType.DEPENDENT);
    }

    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    statistics.setStatisticsEnabled(true);

    statistics.clear();
    mockMvc
        .perform(get("/tasks/" + emptyTask.id() + "/detail").cookie(sessionCookie))
        .andExpect(status().isOk());
    long emptyDetailStatements = statistics.getPrepareStatementCount();

    statistics.clear();
    mockMvc
        .perform(get("/tasks/" + denseTask.id() + "/detail").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.dependencies.blockers.length()").value(12))
        .andExpect(jsonPath("$.dependencies.dependents.length()").value(12));
    long denseDetailStatements = statistics.getPrepareStatementCount();

    assertThat(denseDetailStatements).isEqualTo(emptyDetailStatements).isLessThanOrEqualTo(8);
  }

  private UUID createUser(String prefix) {
    User user =
        User.signup(
                UUID.randomUUID(),
                EmailAddress.of(prefix + "-" + UUID.randomUUID() + "@example.test"),
                "Task Detail Tester",
                Instant.now())
            .verify(Instant.now());
    return userRepository.save(user).id();
  }

  private Task createTask(UUID ownerId, String title, TaskStatus status, int spentMinutes) {
    return taskService.createTask(
        ownerId,
        new CreateTaskCommand(
            Optional.empty(),
            title,
            Optional.empty(),
            status,
            TaskPriority.P2,
            Optional.empty(),
            60,
            spentMinutes,
            0,
            Optional.empty(),
            0,
            Set.of()));
  }
}
