package tech.buildwithpartha.lifeos.audit.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityRecord;
import tech.buildwithpartha.lifeos.project.application.CreateProjectCommand;
import tech.buildwithpartha.lifeos.project.application.ProjectService;
import tech.buildwithpartha.lifeos.project.application.UpdateProjectCommand;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;
import tech.buildwithpartha.lifeos.task.application.CreateTaskCommand;
import tech.buildwithpartha.lifeos.task.application.TaskService;
import tech.buildwithpartha.lifeos.task.application.UpdateTaskCommand;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@ActiveProfiles("test")
@SpringBootTest
class ActivityEmissionIntegrationTests {

  @Autowired private UserRepository userRepository;
  @Autowired private TaskService taskService;
  @Autowired private ProjectService projectService;
  @Autowired private ProductActivityPort activityPort;

  private UUID userId;

  @BeforeEach
  void setUp() {
    Instant now = Instant.now();
    userId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("emission-" + UUID.randomUUID() + "@example.test"),
                        "Emission Owner",
                        now)
                    .verify(now))
            .id();
  }

  @Test
  void taskAndSubtaskLifecycleEmitsOnlyTypedContentFreeEvents() {
    Task created = taskService.createTask(userId, createTask("Initial Task"));
    Task updated =
        taskService.updateTask(
            userId,
            created.id(),
            new UpdateTaskCommand(
                Optional.empty(),
                "Renamed Task",
                Optional.of("Private description"),
                created.status(),
                created.priority(),
                created.dueAt(),
                created.estimateMinutes(),
                created.spentMinutes(),
                created.progress(),
                created.mitDate(),
                created.position(),
                created.version()));
    Task inProgress =
        taskService.changeStatus(userId, updated.id(), TaskStatus.IN_PROGRESS, updated.version());
    Task withSubtask = taskService.addSubtask(userId, inProgress.id(), "Private Subtask", null);
    UUID subtaskId = withSubtask.subtasks().getFirst().id();
    Task completedSubtask = taskService.toggleSubtask(userId, withSubtask.id(), subtaskId);
    Task editedSubtask =
        taskService.updateSubtask(
            userId, completedSubtask.id(), subtaskId, "Renamed Subtask", null, null);
    Task withoutSubtask = taskService.deleteSubtask(userId, editedSubtask.id(), subtaskId);
    Task archived = taskService.archiveTask(userId, withoutSubtask.id(), withoutSubtask.version());

    assertThat(taskService.archiveTask(userId, archived.id(), archived.version()))
        .isEqualTo(archived);

    Task restored = taskService.restoreTask(userId, archived.id(), archived.version());
    taskService.deleteTask(userId, restored.id());

    var events =
        activityPort.findBySubject(userId, ActivitySubjectType.TASK, created.id(), 0, 100).items();

    assertThat(events)
        .extracting(ProductActivityRecord::eventType)
        .containsExactly(
            ActivityEventType.TASK_DELETED,
            ActivityEventType.TASK_RESTORED,
            ActivityEventType.TASK_ARCHIVED,
            ActivityEventType.SUBTASK_DELETED,
            ActivityEventType.SUBTASK_UPDATED,
            ActivityEventType.SUBTASK_COMPLETED,
            ActivityEventType.SUBTASK_CREATED,
            ActivityEventType.TASK_STATUS_CHANGED,
            ActivityEventType.TASK_UPDATED,
            ActivityEventType.TASK_CREATED);
    assertThat(events)
        .allSatisfy(
            event -> {
              assertThat(event.userId()).isEqualTo(userId);
              assertThat(event.actorUserId()).isEqualTo(userId);
              assertThat(event.objectType()).isEqualTo(ActivitySubjectType.TASK);
              assertThat(event.objectId()).isEqualTo(created.id());
            });
  }

  @Test
  void projectLifecycleEmitsCreateUpdateArchiveRestoreAndDelete() {
    Project created =
        projectService.createProject(
            userId,
            new CreateProjectCommand(
                "Initial Project",
                "Private project description",
                ProjectStatus.ACTIVE,
                ProjectPriority.P2,
                ProjectHealth.NOT_SET,
                null,
                null,
                null,
                null,
                null,
                Set.of()));
    Project updated =
        projectService.updateProject(
            userId,
            created.id(),
            new UpdateProjectCommand(
                "Renamed Project",
                "Changed private description",
                ProjectStatus.ACTIVE,
                ProjectPriority.P1,
                ProjectHealth.ON_TRACK,
                null,
                null,
                null,
                null,
                null,
                Set.of(),
                created.version()));
    Project archived = projectService.archiveProject(userId, updated.id(), updated.version());

    assertThat(projectService.archiveProject(userId, archived.id(), archived.version()))
        .isEqualTo(archived);

    Project restored = projectService.restoreProject(userId, archived.id(), archived.version());
    projectService.deleteProject(userId, restored.id());

    assertThat(
            activityPort
                .findBySubject(userId, ActivitySubjectType.PROJECT, created.id(), 0, 100)
                .items())
        .extracting(ProductActivityRecord::eventType)
        .containsExactly(
            ActivityEventType.PROJECT_DELETED,
            ActivityEventType.PROJECT_RESTORED,
            ActivityEventType.PROJECT_ARCHIVED,
            ActivityEventType.PROJECT_UPDATED,
            ActivityEventType.PROJECT_CREATED);
  }

  private static CreateTaskCommand createTask(String title) {
    return new CreateTaskCommand(
        Optional.empty(),
        title,
        Optional.of("Private Task description"),
        TaskStatus.TO_DO,
        TaskPriority.P2,
        Optional.empty(),
        30,
        0,
        0,
        Optional.empty(),
        0);
  }
}
