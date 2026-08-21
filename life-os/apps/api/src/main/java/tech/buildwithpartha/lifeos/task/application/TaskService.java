package tech.buildwithpartha.lifeos.task.application;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

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
