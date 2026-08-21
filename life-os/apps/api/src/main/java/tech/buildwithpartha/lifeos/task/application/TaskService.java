package tech.buildwithpartha.lifeos.task.application;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.task.domain.Subtask;
import tech.buildwithpartha.lifeos.task.domain.Task;
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

  public TaskService(TaskRepository taskRepository) {
    this.taskRepository = taskRepository;
  }

  public Task createTask(UUID userId, CreateTaskCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(command, "command must not be null");

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

    return taskRepository.save(updated);
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
}
