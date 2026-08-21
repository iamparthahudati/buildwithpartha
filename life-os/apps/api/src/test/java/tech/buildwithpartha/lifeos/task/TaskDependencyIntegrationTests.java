package tech.buildwithpartha.lifeos.task;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.Optional;
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
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.task.application.CreateTaskCommand;
import tech.buildwithpartha.lifeos.task.application.TaskService;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskDependenciesSummary;
import tech.buildwithpartha.lifeos.task.domain.TaskDependency;
import tech.buildwithpartha.lifeos.task.domain.TaskDependencyType;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@ActiveProfiles("test")
@SpringBootTest
@Transactional
class TaskDependencyIntegrationTests {

  @Autowired private UserRepository userRepository;
  @Autowired private TaskService taskService;

  private UUID userId;
  private UUID otherUserId;

  @BeforeEach
  void setUp() {
    User user =
        userRepository.save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of("taskdep-" + UUID.randomUUID() + "@example.test"),
                    "Task Dep User",
                    Instant.now())
                .verify(Instant.now()));
    userId = user.id();

    User otherUser =
        userRepository.save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of("taskdep-other-" + UUID.randomUUID() + "@example.test"),
                    "Other User",
                    Instant.now())
                .verify(Instant.now()));
    otherUserId = otherUser.id();
  }

  private Task createTask(UUID uid, String title, TaskStatus status) {
    return taskService.createTask(
        uid,
        new CreateTaskCommand(
            Optional.empty(),
            title,
            Optional.empty(),
            status,
            TaskPriority.P2,
            Optional.empty(),
            0,
            0,
            0,
            Optional.empty(),
            0,
            null));
  }

  @Test
  void addAndRetrieveBlockerDependency() {
    Task taskA = createTask(userId, "Blocker Task A", TaskStatus.TO_DO);
    Task taskB = createTask(userId, "Blocked Task B", TaskStatus.TO_DO);

    // Task A blocks Task B (Task B has blocker Task A)
    TaskDependency dep =
        taskService.addDependency(userId, taskB.id(), taskA.id(), TaskDependencyType.BLOCKER);

    assertThat(dep.blockingTaskId()).isEqualTo(taskA.id());
    assertThat(dep.blockedTaskId()).isEqualTo(taskB.id());

    TaskDependenciesSummary summaryB = taskService.getTaskDependencies(userId, taskB.id());
    assertThat(summaryB.blockers()).hasSize(1);
    assertThat(summaryB.blockers().get(0).id()).isEqualTo(taskA.id());
    assertThat(summaryB.isBlocked()).isTrue();
    assertThat(summaryB.unresolvedBlockerCount()).isEqualTo(1);

    TaskDependenciesSummary summaryA = taskService.getTaskDependencies(userId, taskA.id());
    assertThat(summaryA.dependents()).hasSize(1);
    assertThat(summaryA.dependents().get(0).id()).isEqualTo(taskB.id());
    assertThat(summaryA.isBlocked()).isFalse();
  }

  @Test
  void preventsSelfDependency() {
    Task task = createTask(userId, "Single Task", TaskStatus.TO_DO);

    assertThatThrownBy(
            () ->
                taskService.addDependency(userId, task.id(), task.id(), TaskDependencyType.BLOCKER))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  void preventsDependencyCycles() {
    Task taskA = createTask(userId, "Task A", TaskStatus.TO_DO);
    Task taskB = createTask(userId, "Task B", TaskStatus.TO_DO);

    // A blocks B
    taskService.addDependency(userId, taskB.id(), taskA.id(), TaskDependencyType.BLOCKER);

    // Attempting B blocks A creates cycle
    assertThatThrownBy(
            () ->
                taskService.addDependency(
                    userId, taskA.id(), taskB.id(), TaskDependencyType.BLOCKER))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  void preventsCrossUserDependencies() {
    Task userTask = createTask(userId, "User Task", TaskStatus.TO_DO);
    Task otherTask = createTask(otherUserId, "Other User Task", TaskStatus.TO_DO);

    assertThatThrownBy(
            () ->
                taskService.addDependency(
                    userId, userTask.id(), otherTask.id(), TaskDependencyType.BLOCKER))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void unblocksDependentWhenBlockerCompletes() {
    Task blocker = createTask(userId, "Blocker", TaskStatus.TO_DO);
    Task dependent = createTask(userId, "Dependent", TaskStatus.BLOCKED);

    taskService.addDependency(userId, dependent.id(), blocker.id(), TaskDependencyType.BLOCKER);

    // Completing blocker should trigger auto-unblock of dependent from BLOCKED to TO_DO
    taskService.completeTask(userId, blocker.id(), blocker.version());

    Task updatedDependent = taskService.getTask(userId, dependent.id());
    assertThat(updatedDependent.status()).isEqualTo(TaskStatus.TO_DO);
  }

  @Test
  void removeDependency() {
    Task taskA = createTask(userId, "Blocker Task A", TaskStatus.TO_DO);
    Task taskB = createTask(userId, "Blocked Task B", TaskStatus.TO_DO);

    taskService.addDependency(userId, taskB.id(), taskA.id(), TaskDependencyType.BLOCKER);

    taskService.removeDependency(userId, taskB.id(), taskA.id(), TaskDependencyType.BLOCKER);

    TaskDependenciesSummary summaryB = taskService.getTaskDependencies(userId, taskB.id());
    assertThat(summaryB.blockers()).isEmpty();
    assertThat(summaryB.isBlocked()).isFalse();
  }

  @Test
  void addAndRemoveDependentDependencyType() {
    Task taskA = createTask(userId, "Main Task A", TaskStatus.TO_DO);
    Task taskB = createTask(userId, "Dependent Task B", TaskStatus.TO_DO);

    // Main Task A blocks Task B (Task A has DEPENDENT Task B)
    TaskDependency dep =
        taskService.addDependency(userId, taskA.id(), taskB.id(), TaskDependencyType.DEPENDENT);

    assertThat(dep.blockingTaskId()).isEqualTo(taskA.id());
    assertThat(dep.blockedTaskId()).isEqualTo(taskB.id());

    // Re-adding existing dependency returns existing edge idempotently
    TaskDependency duplicateDep =
        taskService.addDependency(userId, taskA.id(), taskB.id(), TaskDependencyType.DEPENDENT);
    assertThat(duplicateDep).isEqualTo(dep);

    // Remove dependency using DEPENDENT type
    taskService.removeDependency(userId, taskA.id(), taskB.id(), TaskDependencyType.DEPENDENT);

    TaskDependenciesSummary summaryA = taskService.getTaskDependencies(userId, taskA.id());
    assertThat(summaryA.dependents()).isEmpty();
  }

  @Test
  void keepsDependentBlockedIfAnotherBlockerRemains() {
    Task blocker1 = createTask(userId, "Blocker 1", TaskStatus.TO_DO);
    Task blocker2 = createTask(userId, "Blocker 2", TaskStatus.TO_DO);
    Task dependent = createTask(userId, "Dependent Task", TaskStatus.BLOCKED);

    taskService.addDependency(userId, dependent.id(), blocker1.id(), TaskDependencyType.BLOCKER);
    taskService.addDependency(userId, dependent.id(), blocker2.id(), TaskDependencyType.BLOCKER);

    // Completing blocker1 still leaves blocker2 unresolved
    taskService.completeTask(userId, blocker1.id(), blocker1.version());

    Task updatedDependent = taskService.getTask(userId, dependent.id());
    assertThat(updatedDependent.status()).isEqualTo(TaskStatus.BLOCKED);
  }

  @Test
  void preventsDependencyOnSoftDeletedTask() {
    Task taskA = createTask(userId, "Task A", TaskStatus.TO_DO);
    Task taskB = createTask(userId, "Task B", TaskStatus.TO_DO);

    taskService.deleteTask(userId, taskB.id());

    assertThatThrownBy(
            () ->
                taskService.addDependency(
                    userId, taskA.id(), taskB.id(), TaskDependencyType.BLOCKER))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void preventsDependencyWhenMainTaskIsSoftDeleted() {
    Task taskA = createTask(userId, "Task A", TaskStatus.TO_DO);
    Task taskB = createTask(userId, "Task B", TaskStatus.TO_DO);

    taskService.deleteTask(userId, taskA.id());

    assertThatThrownBy(
            () ->
                taskService.addDependency(
                    userId, taskA.id(), taskB.id(), TaskDependencyType.BLOCKER))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void completeBlockerDoesNotChangeStatusIfDependentNotBlocked() {
    Task blocker = createTask(userId, "Blocker", TaskStatus.TO_DO);
    Task dependent = createTask(userId, "Dependent", TaskStatus.IN_PROGRESS);

    taskService.addDependency(userId, dependent.id(), blocker.id(), TaskDependencyType.BLOCKER);

    taskService.completeTask(userId, blocker.id(), blocker.version());

    Task updatedDependent = taskService.getTask(userId, dependent.id());
    assertThat(updatedDependent.status()).isEqualTo(TaskStatus.IN_PROGRESS);
  }

  @Test
  void reportsCompletedBlockersInSummaryWithZeroUnresolvedCount() {
    Task blocker = createTask(userId, "Completed Blocker", TaskStatus.DONE);
    Task task = createTask(userId, "Main Task", TaskStatus.TO_DO);

    taskService.addDependency(userId, task.id(), blocker.id(), TaskDependencyType.BLOCKER);

    TaskDependenciesSummary summary = taskService.getTaskDependencies(userId, task.id());
    assertThat(summary.blockers()).hasSize(1);
    assertThat(summary.unresolvedBlockerCount()).isEqualTo(0);
    assertThat(summary.isBlocked()).isFalse();
  }

  @Test
  void completeBlockerHandlesDeletedDependentTaskSafely() {
    Task blocker = createTask(userId, "Blocker", TaskStatus.TO_DO);
    Task dependent = createTask(userId, "Dependent", TaskStatus.BLOCKED);

    taskService.addDependency(userId, dependent.id(), blocker.id(), TaskDependencyType.BLOCKER);
    taskService.deleteTask(userId, dependent.id());

    taskService.completeTask(userId, blocker.id(), blocker.version());

    TaskDependenciesSummary summary = taskService.getTaskDependencies(userId, blocker.id());
    assertThat(summary.dependents()).isEmpty();
  }
}
