package tech.buildwithpartha.lifeos.task;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.label.application.CreateLabelCommand;
import tech.buildwithpartha.lifeos.label.application.LabelService;
import tech.buildwithpartha.lifeos.label.domain.Label;
import tech.buildwithpartha.lifeos.task.application.CreateTaskCommand;
import tech.buildwithpartha.lifeos.task.application.TaskService;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskQuery;
import tech.buildwithpartha.lifeos.task.domain.TaskQueryResult;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@ActiveProfiles("test")
@SpringBootTest
@Transactional
class TaskLabelIntegrationTests {

  @Autowired private UserRepository userRepository;
  @Autowired private LabelService labelService;
  @Autowired private TaskService taskService;

  private UUID userId;
  private UUID otherUserId;
  private Label labelA;
  private Label labelB;

  @BeforeEach
  void setUp() {
    User user =
        userRepository.save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of("tasklabel-" + UUID.randomUUID() + "@example.test"),
                    "Task Label User",
                    Instant.now())
                .verify(Instant.now()));
    userId = user.id();

    User otherUser =
        userRepository.save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of("othertasklabel-" + UUID.randomUUID() + "@example.test"),
                    "Other Task Label User",
                    Instant.now())
                .verify(Instant.now()));
    otherUserId = otherUser.id();

    labelA = labelService.createLabel(userId, new CreateLabelCommand("Work", "#FF0000"));
    labelB = labelService.createLabel(userId, new CreateLabelCommand("Urgent", "#00FF00"));
  }

  @Test
  void createTaskWithLabels_savesAndRetrievesLabels() {
    CreateTaskCommand command =
        new CreateTaskCommand(
            Optional.empty(),
            "Labelled Task",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P1,
            Optional.empty(),
            30,
            0,
            0,
            Optional.empty(),
            0,
            Set.of(labelA.id(), labelB.id()));

    Task task = taskService.createTask(userId, command);

    assertThat(task.labelIds()).containsExactlyInAnyOrder(labelA.id(), labelB.id());

    Task retrieved = taskService.getTask(userId, task.id());
    assertThat(retrieved.labelIds()).containsExactlyInAnyOrder(labelA.id(), labelB.id());
  }

  @Test
  void createTaskWithOtherUsersLabel_rejectsWithFieldValidationException() {
    Label otherUserLabel =
        labelService.createLabel(otherUserId, new CreateLabelCommand("Private", null));

    CreateTaskCommand command =
        new CreateTaskCommand(
            Optional.empty(),
            "Illegal Task",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P1,
            Optional.empty(),
            30,
            0,
            0,
            Optional.empty(),
            0,
            Set.of(otherUserLabel.id()));

    assertThatThrownBy(() -> taskService.createTask(userId, command))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  void queryTasksByLabelId_returnsMatchingTasks() {
    Task t1 =
        taskService.createTask(
            userId,
            new CreateTaskCommand(
                Optional.empty(),
                "Task 1",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P2,
                Optional.empty(),
                0,
                0,
                0,
                Optional.empty(),
                0,
                Set.of(labelA.id())));

    taskService.createTask(
        userId,
        new CreateTaskCommand(
            Optional.empty(),
            "Task 2",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P2,
            Optional.empty(),
            0,
            0,
            0,
            Optional.empty(),
            0,
            Set.of(labelB.id())));

    TaskQuery query =
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
            Set.of(labelA.id()),
            0,
            20,
            "createdAt",
            "DESC");

    TaskQueryResult result = taskService.queryTasks(query);

    assertThat(result.tasks()).hasSize(1);
    assertThat(result.tasks().get(0).id()).isEqualTo(t1.id());
  }

  @Test
  void deleteLabelWithReplacement_updatesTaskLabels() {
    Task task =
        taskService.createTask(
            userId,
            new CreateTaskCommand(
                Optional.empty(),
                "Reassigned Task",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P1,
                Optional.empty(),
                0,
                0,
                0,
                Optional.empty(),
                0,
                Set.of(labelA.id())));

    labelService.deleteLabel(userId, labelA.id(), Optional.of(labelB.id()));

    Task updatedTask = taskService.getTask(userId, task.id());
    assertThat(updatedTask.labelIds()).containsExactly(labelB.id());
  }
}
