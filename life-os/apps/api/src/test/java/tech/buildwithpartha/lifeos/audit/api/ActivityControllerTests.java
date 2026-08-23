package tech.buildwithpartha.lifeos.audit.api;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
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
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.project.application.ProjectService;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;
import tech.buildwithpartha.lifeos.task.application.CreateTaskCommand;
import tech.buildwithpartha.lifeos.task.application.TaskService;
import tech.buildwithpartha.lifeos.task.application.UpdateTaskCommand;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class ActivityControllerTests {

  @Autowired private MockMvc mockMvc;
  @Autowired private UserRepository userRepository;
  @Autowired private SessionRepository sessionRepository;
  @Autowired private SecureTokenGenerator tokenGenerator;
  @Autowired private TaskRepository taskRepository;
  @Autowired private ProjectRepository projectRepository;
  @Autowired private TaskService taskService;
  @Autowired private ProjectService projectService;
  @Autowired private ProductActivityPort activityPort;

  private UUID userId;
  private UUID otherUserId;
  private Cookie sessionCookie;

  @BeforeEach
  void setUp() {
    Instant now = Instant.now();
    userId = createUser("activity-owner-", "Activity Owner", now);
    otherUserId = createUser("activity-other-", "Activity Other", now);
    RawToken sessionToken = tokenGenerator.generate();
    RawToken csrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionToken.hash(),
            csrfToken.hash(),
            now,
            Optional.empty()));
    sessionCookie = new Cookie("lifeos_session", sessionToken.value());
  }

  @Test
  void taskActivityRequiresAuthenticationAndReturnsStableBoundedPages() throws Exception {
    Task task = taskRepository.save(task(userId, Optional.empty(), "Current Task"));
    record(task, ActivityEventType.TASK_CREATED);
    record(task, ActivityEventType.TASK_UPDATED);
    record(task, ActivityEventType.TASK_STATUS_CHANGED);

    mockMvc
        .perform(get("/tasks/{taskId}/activity", task.id()))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            get("/tasks/{taskId}/activity", task.id())
                .cookie(sessionCookie)
                .param("page", "0")
                .param("size", "2"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items", hasSize(2)))
        .andExpect(jsonPath("$.items[0].eventType").value("TASK_STATUS_CHANGED"))
        .andExpect(jsonPath("$.items[0].actorUserId").value(userId.toString()))
        .andExpect(jsonPath("$.items[0].object.type").value("TASK"))
        .andExpect(jsonPath("$.items[0].object.id").value(task.id().toString()))
        .andExpect(jsonPath("$.items[0].object.label").value("Current Task"))
        .andExpect(jsonPath("$.items[0].object.href").value("/life-os/app/tasks/" + task.id()))
        .andExpect(jsonPath("$.items[0].occurredAt").exists())
        .andExpect(jsonPath("$.items[0].correlationId").doesNotExist())
        .andExpect(jsonPath("$.page").value(0))
        .andExpect(jsonPath("$.size").value(2))
        .andExpect(jsonPath("$.totalItems").value(3))
        .andExpect(jsonPath("$.totalPages").value(2));

    mockMvc
        .perform(
            get("/tasks/{taskId}/activity", task.id())
                .cookie(sessionCookie)
                .param("page", "1")
                .param("size", "2"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items", hasSize(1)))
        .andExpect(jsonPath("$.items[0].eventType").value("TASK_CREATED"));

    mockMvc
        .perform(
            get("/tasks/{taskId}/activity", task.id()).cookie(sessionCookie).param("size", "101"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("size"));
  }

  @Test
  void crossUserAndMissingSubjectsShareTheSameNotFoundResponse() throws Exception {
    Task otherTask = taskRepository.save(task(otherUserId, Optional.empty(), "Private Task"));

    mockMvc
        .perform(get("/tasks/{taskId}/activity", otherTask.id()).cookie(sessionCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    mockMvc
        .perform(get("/projects/{projectId}/activity", UUID.randomUUID()).cookie(sessionCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  @Test
  void deletedTaskRemainsOwnerReadableWithANullObjectFallback() throws Exception {
    Task task = taskRepository.save(task(userId, Optional.empty(), "Delete without snapshot"));

    taskService.deleteTask(userId, task.id());

    mockMvc
        .perform(get("/tasks/{taskId}/activity", task.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].eventType").value("TASK_DELETED"))
        .andExpect(jsonPath("$.items[0].object").doesNotExist())
        .andExpect(jsonPath("$.items[0].title").doesNotExist())
        .andExpect(jsonPath("$.items[0].description").doesNotExist());
  }

  @Test
  void projectFeedIncludesTaskChangesAndFallsBackAfterTaskDeletion() throws Exception {
    Project project = projectRepository.save(project(userId, "Activity Project"));
    Task task =
        taskService.createTask(
            userId,
            new CreateTaskCommand(
                Optional.of(project.id()),
                "Project Task",
                Optional.of("Never copied into Activity"),
                TaskStatus.TO_DO,
                TaskPriority.P2,
                Optional.empty(),
                30,
                0,
                0,
                Optional.empty(),
                0));

    mockMvc
        .perform(get("/projects/{projectId}/activity", project.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].eventType").value("TASK_CREATED"))
        .andExpect(jsonPath("$.items[0].object.label").value("Project Task"))
        .andExpect(jsonPath("$.items[0].description").doesNotExist());

    taskService.deleteTask(userId, task.id());

    mockMvc
        .perform(get("/projects/{projectId}/activity", project.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].eventType").value("TASK_DELETED"))
        .andExpect(jsonPath("$.items[0].object").doesNotExist());
  }

  @Test
  void movingTaskRecordsTheChangeInBothAffectedProjectFeeds() throws Exception {
    Project previousProject = projectRepository.save(project(userId, "Previous Project"));
    Project currentProject = projectRepository.save(project(userId, "Current Project"));
    Task task =
        taskService.createTask(
            userId,
            new CreateTaskCommand(
                Optional.of(previousProject.id()),
                "Moving Task",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P2,
                Optional.empty(),
                30,
                0,
                0,
                Optional.empty(),
                0));

    taskService.updateTask(
        userId,
        task.id(),
        new UpdateTaskCommand(
            Optional.of(currentProject.id()),
            task.title(),
            task.description(),
            task.status(),
            task.priority(),
            task.dueAt(),
            task.estimateMinutes(),
            task.spentMinutes(),
            task.progress(),
            task.mitDate(),
            task.position(),
            task.version()));

    mockMvc
        .perform(get("/projects/{projectId}/activity", previousProject.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].eventType").value("TASK_UPDATED"))
        .andExpect(jsonPath("$.items[0].object.label").value("Moving Task"));
    mockMvc
        .perform(get("/projects/{projectId}/activity", currentProject.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].eventType").value("TASK_UPDATED"))
        .andExpect(jsonPath("$.items[0].object.label").value("Moving Task"));
  }

  @Test
  void hardDeletedProjectHistoryUsesItsOwnedEventAsAuthorizationEvidence() throws Exception {
    Project project = projectRepository.save(project(userId, "Temporary Project"));

    projectService.deleteProject(userId, project.id());

    mockMvc
        .perform(get("/projects/{projectId}/activity", project.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].eventType").value("PROJECT_DELETED"))
        .andExpect(jsonPath("$.items[0].object").doesNotExist());
  }

  private void record(Task task, ActivityEventType type) {
    activityPort.record(
        new ProductActivityCommand(
            task.userId(), task.userId(), type, ActivitySubjectType.TASK, task.id()));
  }

  private UUID createUser(String prefix, String displayName, Instant now) {
    return userRepository
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + UUID.randomUUID() + "@example.test"),
                    displayName,
                    now)
                .verify(now))
        .id();
  }

  private static Task task(UUID owner, Optional<UUID> projectId, String title) {
    Instant now = Instant.now();
    return new Task(
        UUID.randomUUID(),
        owner,
        projectId,
        title,
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
        0);
  }

  private static Project project(UUID owner, String name) {
    Instant now = Instant.now();
    return new Project(
        UUID.randomUUID(),
        owner,
        name,
        Optional.empty(),
        ProjectStatus.ACTIVE,
        ProjectPriority.P2,
        ProjectHealth.NOT_SET,
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        now,
        now,
        Set.of(),
        0);
  }
}
