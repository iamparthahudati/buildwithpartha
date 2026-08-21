package tech.buildwithpartha.lifeos.task.application;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.label.LabelOwnershipValidator;
import tech.buildwithpartha.lifeos.common.project.ProjectOwnershipValidator;
import tech.buildwithpartha.lifeos.task.domain.DependencyCycleValidator;
import tech.buildwithpartha.lifeos.task.domain.Subtask;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskDependenciesSummary;
import tech.buildwithpartha.lifeos.task.domain.TaskDependency;
import tech.buildwithpartha.lifeos.task.domain.TaskDependencyRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskDependencyType;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskQuery;
import tech.buildwithpartha.lifeos.task.domain.TaskQueryResult;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;
import tech.buildwithpartha.lifeos.task.domain.TaskSummaryCounts;

@Service
@Transactional
public class TaskService {

  private final TaskRepository taskRepository;
  private final LabelOwnershipValidator labelOwnershipValidator;
  private final TaskDependencyRepository taskDependencyRepository;
  private final ProjectOwnershipValidator projectOwnershipValidator;

  public TaskService(
      TaskRepository taskRepository,
      LabelOwnershipValidator labelOwnershipValidator,
      TaskDependencyRepository taskDependencyRepository,
      ProjectOwnershipValidator projectOwnershipValidator) {
    this.taskRepository = taskRepository;
    this.labelOwnershipValidator = labelOwnershipValidator;
    this.taskDependencyRepository = taskDependencyRepository;
    this.projectOwnershipValidator = projectOwnershipValidator;
  }

  public Task createTask(UUID userId, CreateTaskCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    Set<UUID> labelIds = command.labelIds() != null ? command.labelIds() : Set.of();

    labelOwnershipValidator.validateOwnership(userId, labelIds);

    Instant now = Instant.now();
    Task task =
        new Task(
            UUID.randomUUID(),
            userId,
            command.projectId(),
            command.title().trim(),
            command.description().map(String::trim),
            command.status() != null ? command.status() : TaskStatus.TO_DO,
            command.priority() != null ? command.priority() : TaskPriority.P3,
            command.dueAt(),
            command.estimateMinutes(),
            command.spentMinutes(),
            command.progress(),
            command.mitDate(),
            command.position(),
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            labelIds,
            0L);

    return taskRepository.save(task);
  }

  @Transactional(readOnly = true)
  public Task getTask(UUID userId, UUID taskId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");

    return taskRepository
        .findByIdAndUserId(taskId, userId)
        .filter(t -> !t.isDeleted())
        .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
  }

  @Transactional(readOnly = true)
  public TaskQueryResult queryTasks(TaskQuery query) {
    Objects.requireNonNull(query, "query must not be null");
    return taskRepository.queryTasks(query);
  }

  @Transactional(readOnly = true)
  public TaskSummaryCounts getSummaryCounts(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return taskRepository.getSummaryCounts(userId, Instant.now());
  }

  public Task updateTask(UUID userId, UUID taskId, UpdateTaskCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    Task existing = getTask(userId, taskId);
    checkVersion(existing, command.version());

    Set<UUID> labelIds = command.labelIds() != null ? command.labelIds() : existing.labelIds();

    labelOwnershipValidator.validateOwnership(userId, labelIds);

    Instant now = Instant.now();
    Task updated =
        existing.withUpdates(
            command.projectId(),
            command.title().trim(),
            command.description().map(String::trim),
            command.status(),
            command.priority(),
            command.dueAt(),
            command.estimateMinutes(),
            command.spentMinutes(),
            command.progress(),
            command.mitDate(),
            command.position(),
            labelIds,
            now);

    return taskRepository.save(updated);
  }

  public Task changeStatus(UUID userId, UUID taskId, TaskStatus status, long version) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");
    Objects.requireNonNull(status, "status must not be null");

    Task existing = getTask(userId, taskId);
    checkVersion(existing, version);

    Instant now = Instant.now();
    int progress = status == TaskStatus.DONE ? 100 : existing.progress();
    Optional<java.time.LocalDate> mitDate =
        status.isTerminal() ? Optional.empty() : existing.mitDate();

    Task updated =
        existing.withUpdates(
            existing.projectId(),
            existing.title(),
            existing.description(),
            status,
            existing.priority(),
            existing.dueAt(),
            existing.estimateMinutes(),
            existing.spentMinutes(),
            progress,
            mitDate,
            existing.position(),
            now);

    Task saved = taskRepository.save(updated);
    if (status.isTerminal()) {
      unblockDependentsIfAllBlockersResolved(userId, taskId);
    }
    return saved;
  }

  public Task completeTask(UUID userId, UUID taskId, long version) {
    return changeStatus(userId, taskId, TaskStatus.DONE, version);
  }

  public Task cancelTask(UUID userId, UUID taskId, long version) {
    return changeStatus(userId, taskId, TaskStatus.CANCELLED, version);
  }

  public Task archiveTask(UUID userId, UUID taskId, long version) {
    Task existing = getTask(userId, taskId);
    checkVersion(existing, version);
    if (existing.isArchived()) {
      return existing;
    }
    Instant now = Instant.now();
    Task archived = existing.archive(now, now);
    return taskRepository.save(archived);
  }

  public Task restoreTask(UUID userId, UUID taskId, long version) {
    Task existing = getTask(userId, taskId);
    checkVersion(existing, version);
    if (!existing.isArchived()) {
      return existing;
    }
    Instant now = Instant.now();
    Task restored = existing.restore(now);
    return taskRepository.save(restored);
  }

  public void deleteTask(UUID userId, UUID taskId) {
    Task existing = getTask(userId, taskId);
    Instant now = Instant.now();
    Task deleted = existing.softDelete(now, now);
    taskRepository.save(deleted);
  }

  public Task duplicateTask(UUID userId, UUID taskId, String newTitle) {
    Task existing = getTask(userId, taskId);
    Instant now = Instant.now();
    Task duplicated = existing.duplicate(UUID.randomUUID(), newTitle, now);
    return taskRepository.save(duplicated);
  }

  public Task applyBulkAction(UUID userId, UUID taskId, BulkTaskActionCommand command) {
    Objects.requireNonNull(command, "command must not be null");
    Task existing = getTask(userId, taskId);

    return switch (command.action()) {
      case STATUS -> applyBulkStatus(userId, existing, command.status());
      case PRIORITY -> applyBulkPriority(existing, command.priority());
      case PROJECT -> applyBulkProject(userId, existing, command.projectId());
      case ADD_LABEL -> applyBulkLabel(userId, existing, command.labelId(), true);
      case REMOVE_LABEL -> applyBulkLabel(userId, existing, command.labelId(), false);
      case SCHEDULE -> applyBulkDueAt(existing, command.dueAt());
      case CLEAR_SCHEDULE -> applyBulkDueAt(existing, Optional.empty());
      case ARCHIVE -> applyBulkArchive(existing);
    };
  }

  private Task applyBulkStatus(UUID userId, Task existing, TaskStatus status) {
    Objects.requireNonNull(status, "status must not be null");
    if (existing.status() == status) {
      return existing;
    }

    int progress = status == TaskStatus.DONE ? 100 : existing.progress();
    Optional<LocalDate> mitDate = status.isTerminal() ? Optional.empty() : existing.mitDate();
    Task saved =
        saveBulkFields(
            existing,
            existing.projectId(),
            status,
            existing.priority(),
            existing.dueAt(),
            mitDate,
            existing.labelIds(),
            progress);
    if (status.isTerminal()) {
      unblockDependentsIfAllBlockersResolved(userId, existing.id());
    }
    return saved;
  }

  private Task applyBulkPriority(Task existing, TaskPriority priority) {
    Objects.requireNonNull(priority, "priority must not be null");
    if (existing.priority() == priority) {
      return existing;
    }
    return saveBulkFields(
        existing,
        existing.projectId(),
        existing.status(),
        priority,
        existing.dueAt(),
        existing.mitDate(),
        existing.labelIds(),
        existing.progress());
  }

  private Task applyBulkProject(UUID userId, Task existing, Optional<UUID> projectId) {
    projectId.ifPresent(id -> projectOwnershipValidator.validateAssignment(userId, id));
    if (existing.projectId().equals(projectId)) {
      return existing;
    }
    return saveBulkFields(
        existing,
        projectId,
        existing.status(),
        existing.priority(),
        existing.dueAt(),
        existing.mitDate(),
        existing.labelIds(),
        existing.progress());
  }

  private Task applyBulkLabel(UUID userId, Task existing, UUID labelId, boolean add) {
    Objects.requireNonNull(labelId, "labelId must not be null");
    labelOwnershipValidator.validateOwnership(userId, Set.of(labelId));
    boolean alreadyApplied = add == existing.labelIds().contains(labelId);
    if (alreadyApplied) {
      return existing;
    }

    Set<UUID> labelIds = new HashSet<>(existing.labelIds());
    if (add) {
      labelIds.add(labelId);
    } else {
      labelIds.remove(labelId);
    }
    return saveBulkFields(
        existing,
        existing.projectId(),
        existing.status(),
        existing.priority(),
        existing.dueAt(),
        existing.mitDate(),
        labelIds,
        existing.progress());
  }

  private Task applyBulkDueAt(Task existing, Optional<Instant> dueAt) {
    if (existing.dueAt().equals(dueAt)) {
      return existing;
    }
    return saveBulkFields(
        existing,
        existing.projectId(),
        existing.status(),
        existing.priority(),
        dueAt,
        existing.mitDate(),
        existing.labelIds(),
        existing.progress());
  }

  private Task applyBulkArchive(Task existing) {
    if (existing.isArchived()) {
      return existing;
    }
    Instant now = Instant.now();
    return taskRepository.save(existing.archive(now, now));
  }

  private Task saveBulkFields(
      Task existing,
      Optional<UUID> projectId,
      TaskStatus status,
      TaskPriority priority,
      Optional<Instant> dueAt,
      Optional<LocalDate> mitDate,
      Set<UUID> labelIds,
      int progress) {
    return taskRepository.save(
        existing.withUpdates(
            projectId,
            existing.title(),
            existing.description(),
            status,
            priority,
            dueAt,
            existing.estimateMinutes(),
            existing.spentMinutes(),
            progress,
            mitDate,
            existing.position(),
            labelIds,
            Instant.now()));
  }

  public Task addSubtask(UUID userId, UUID taskId, String title, Integer requestedPosition) {
    Task task = getTask(userId, taskId);
    Instant now = Instant.now();
    int position =
        requestedPosition != null
            ? requestedPosition
            : task.subtasks().stream().mapToInt(Subtask::position).max().orElse(-1) + 1;

    Subtask newSubtask =
        new Subtask(UUID.randomUUID(), taskId, title.trim(), false, position, now, now, 0L);

    List<Subtask> updatedSubtasks = new ArrayList<>(task.subtasks());
    updatedSubtasks.add(newSubtask);

    Task updatedTask = task.withSubtasks(updatedSubtasks, now);
    return taskRepository.save(recalculateTaskProgress(updatedTask, now));
  }

  public Task updateSubtask(
      UUID userId, UUID taskId, UUID subtaskId, String title, Boolean completed, Integer position) {
    Task task = getTask(userId, taskId);
    Instant now = Instant.now();

    List<Subtask> updatedSubtasks =
        task.subtasks().stream()
            .map(
                s -> {
                  if (s.id().equals(subtaskId)) {
                    String newTitle = title != null ? title.trim() : s.title();
                    boolean newCompleted = completed != null ? completed : s.completed();
                    int newPosition = position != null ? position : s.position();
                    return new Subtask(
                        s.id(),
                        s.taskId(),
                        newTitle,
                        newCompleted,
                        newPosition,
                        s.createdAt(),
                        now,
                        s.version());
                  }
                  return s;
                })
            .toList();

    Task updatedTask = task.withSubtasks(updatedSubtasks, now);
    return taskRepository.save(recalculateTaskProgress(updatedTask, now));
  }

  public Task toggleSubtask(UUID userId, UUID taskId, UUID subtaskId) {
    Task task = getTask(userId, taskId);
    Instant now = Instant.now();

    List<Subtask> updatedSubtasks =
        task.subtasks().stream()
            .map(s -> s.id().equals(subtaskId) ? s.withCompleted(!s.completed(), now) : s)
            .toList();

    Task updatedTask = task.withSubtasks(updatedSubtasks, now);
    return taskRepository.save(recalculateTaskProgress(updatedTask, now));
  }

  public Task deleteSubtask(UUID userId, UUID taskId, UUID subtaskId) {
    Task task = getTask(userId, taskId);
    Instant now = Instant.now();

    List<Subtask> updatedSubtasks =
        task.subtasks().stream().filter(s -> !s.id().equals(subtaskId)).toList();

    Task updatedTask = task.withSubtasks(updatedSubtasks, now);
    return taskRepository.save(recalculateTaskProgress(updatedTask, now));
  }

  public Task reorderSubtasks(UUID userId, UUID taskId, List<UUID> subtaskIds) {
    Task task = getTask(userId, taskId);
    Instant now = Instant.now();

    Map<UUID, Integer> positionMap = new HashMap<>();
    for (int i = 0; i < subtaskIds.size(); i++) {
      positionMap.put(subtaskIds.get(i), i);
    }

    List<Subtask> reordered =
        task.subtasks().stream()
            .map(
                s -> {
                  Integer newPos = positionMap.get(s.id());
                  return newPos != null ? s.withPosition(newPos, now) : s;
                })
            .sorted(Comparator.comparingInt(Subtask::position))
            .toList();

    Task updatedTask = task.withSubtasks(reordered, now);
    return taskRepository.save(updatedTask);
  }

  private Task recalculateTaskProgress(Task task, Instant now) {
    List<Subtask> subtasks = task.subtasks();
    if (subtasks.isEmpty()) {
      return task;
    }
    long completedCount = subtasks.stream().filter(Subtask::completed).count();
    int progress = (int) Math.round(((double) completedCount / subtasks.size()) * 100.0);
    return task.withUpdates(
        task.projectId(),
        task.title(),
        task.description(),
        task.status(),
        task.priority(),
        task.dueAt(),
        task.estimateMinutes(),
        task.spentMinutes(),
        progress,
        task.mitDate(),
        task.position(),
        now);
  }

  public Task setMit(UUID userId, UUID taskId, LocalDate date) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");
    Objects.requireNonNull(date, "date must not be null");

    Task task = getTask(userId, taskId);
    if (task.status().isTerminal()) {
      throw new IllegalArgumentException("Cannot set terminal task as MIT");
    }

    taskRepository.clearMitDateForUserAndDate(userId, date);

    Instant now = Instant.now();
    Task updated =
        task.withUpdates(
            task.projectId(),
            task.title(),
            task.description(),
            task.status(),
            task.priority(),
            task.dueAt(),
            task.estimateMinutes(),
            task.spentMinutes(),
            task.progress(),
            Optional.of(date),
            task.position(),
            now);

    return taskRepository.save(updated);
  }

  public Task clearMit(UUID userId, UUID taskId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");

    Task task = getTask(userId, taskId);
    if (task.mitDate().isEmpty()) {
      return task;
    }

    Instant now = Instant.now();
    Task updated =
        task.withUpdates(
            task.projectId(),
            task.title(),
            task.description(),
            task.status(),
            task.priority(),
            task.dueAt(),
            task.estimateMinutes(),
            task.spentMinutes(),
            task.progress(),
            Optional.empty(),
            task.position(),
            now);

    return taskRepository.save(updated);
  }

  @Transactional(readOnly = true)
  public Optional<Task> getMitForDate(UUID userId, LocalDate date) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(date, "date must not be null");

    return taskRepository.findByUserIdAndMitDate(userId, date).stream()
        .filter(t -> !t.isDeleted() && !t.isArchived())
        .findFirst();
  }

  private void checkVersion(Task existing, long expectedVersion) {
    if (existing.version() != expectedVersion) {
      throw new ConcurrencyConflictException(
          "Task "
              + existing.id()
              + " version conflict: expected "
              + expectedVersion
              + " but was "
              + existing.version());
    }
  }

  public TaskDependency addDependency(
      UUID userId, UUID taskId, UUID targetTaskId, TaskDependencyType type) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");
    Objects.requireNonNull(targetTaskId, "targetTaskId must not be null");
    Objects.requireNonNull(type, "type must not be null");

    if (taskId.equals(targetTaskId)) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("targetTaskId", "INVALID_DEPENDENCY")));
    }

    Task task = getTask(userId, taskId);
    Task targetTask = getTask(userId, targetTaskId);

    if (task.isDeleted() || targetTask.isDeleted()) {
      throw new ResourceNotFoundException("Task not found or deleted");
    }

    UUID blockingTaskId = type == TaskDependencyType.BLOCKER ? targetTaskId : taskId;
    UUID blockedTaskId = type == TaskDependencyType.BLOCKER ? taskId : targetTaskId;

    if (taskDependencyRepository.exists(blockingTaskId, blockedTaskId)) {
      return taskDependencyRepository
          .find(blockingTaskId, blockedTaskId)
          .orElseGet(
              () ->
                  taskDependencyRepository.save(
                      new TaskDependency(blockingTaskId, blockedTaskId, Instant.now())));
    }

    List<TaskDependency> existingUserDependencies = taskDependencyRepository.findAllForUser(userId);

    if (DependencyCycleValidator.wouldCreateCycle(
        existingUserDependencies, blockingTaskId, blockedTaskId)) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("targetTaskId", "INVALID_DEPENDENCY")));
    }

    return taskDependencyRepository.save(
        new TaskDependency(blockingTaskId, blockedTaskId, Instant.now()));
  }

  public void removeDependency(
      UUID userId, UUID taskId, UUID targetTaskId, TaskDependencyType type) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");
    Objects.requireNonNull(targetTaskId, "targetTaskId must not be null");
    Objects.requireNonNull(type, "type must not be null");

    // Verify main task exists and belongs to user
    getTask(userId, taskId);

    UUID blockingTaskId = type == TaskDependencyType.BLOCKER ? targetTaskId : taskId;
    UUID blockedTaskId = type == TaskDependencyType.BLOCKER ? taskId : targetTaskId;

    taskDependencyRepository.delete(blockingTaskId, blockedTaskId);
  }

  @Transactional(readOnly = true)
  public TaskDependenciesSummary getTaskDependencies(UUID userId, UUID taskId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");

    getTask(userId, taskId);

    List<TaskDependency> blockerDeps = taskDependencyRepository.findBlockersForTask(taskId);
    List<TaskDependency> dependentDeps = taskDependencyRepository.findDependentsForTask(taskId);

    List<Task> blockers =
        blockerDeps.stream()
            .map(dep -> taskRepository.findByIdAndUserId(dep.blockingTaskId(), userId))
            .flatMap(Optional::stream)
            .filter(t -> !t.isDeleted())
            .toList();

    List<Task> dependents =
        dependentDeps.stream()
            .map(dep -> taskRepository.findByIdAndUserId(dep.blockedTaskId(), userId))
            .flatMap(Optional::stream)
            .filter(t -> !t.isDeleted())
            .toList();

    long unresolvedBlockerCount = blockers.stream().filter(t -> !t.status().isTerminal()).count();

    boolean isBlocked = unresolvedBlockerCount > 0;

    return new TaskDependenciesSummary(blockers, dependents, isBlocked, unresolvedBlockerCount);
  }

  private void unblockDependentsIfAllBlockersResolved(UUID userId, UUID blockingTaskId) {
    List<TaskDependency> dependents =
        taskDependencyRepository.findDependentsForTask(blockingTaskId);
    Instant now = Instant.now();
    for (TaskDependency dep : dependents) {
      Optional<Task> dependentTaskOpt =
          taskRepository.findByIdAndUserId(dep.blockedTaskId(), userId);
      if (dependentTaskOpt.isPresent() && !dependentTaskOpt.get().isDeleted()) {
        Task dependentTask = dependentTaskOpt.get();
        if (dependentTask.status() == TaskStatus.BLOCKED) {
          TaskDependenciesSummary summary = getTaskDependencies(userId, dependentTask.id());
          if (!summary.isBlocked()) {
            Task unblocked =
                dependentTask.withUpdates(
                    dependentTask.projectId(),
                    dependentTask.title(),
                    dependentTask.description(),
                    TaskStatus.TO_DO,
                    dependentTask.priority(),
                    dependentTask.dueAt(),
                    dependentTask.estimateMinutes(),
                    dependentTask.spentMinutes(),
                    dependentTask.progress(),
                    dependentTask.mitDate(),
                    dependentTask.position(),
                    now);
            taskRepository.save(unblocked);
          }
        }
      }
    }
  }
}
