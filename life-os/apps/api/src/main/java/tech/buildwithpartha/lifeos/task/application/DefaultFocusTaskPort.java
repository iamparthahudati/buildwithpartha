package tech.buildwithpartha.lifeos.task.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.focus.FocusTaskPort;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

/** Task-owned implementation of Focus Session context and time reconciliation. */
@Service
public class DefaultFocusTaskPort implements FocusTaskPort {

  private final TaskRepository taskRepository;

  public DefaultFocusTaskPort(TaskRepository taskRepository) {
    this.taskRepository = taskRepository;
  }

  @Override
  public void validateStart(UUID userId, UUID taskId) {
    Task task = requireOwnedTask(userId, taskId);
    if (task.isArchived() || task.isDeleted() || task.status().isTerminal()) {
      throw new FieldValidationException(
          "Task cannot start focus",
          List.of(new FieldProblem("taskId", "TASK_NOT_AVAILABLE_FOR_FOCUS")));
    }
  }

  @Override
  public void recordCompletedMinutes(UUID userId, UUID taskId, int minutes, Instant now) {
    Task task = requireOwnedTask(userId, taskId);
    if (minutes > 0) {
      taskRepository.save(task.recordSpentMinutes(minutes, now));
    }
  }

  private Task requireOwnedTask(UUID userId, UUID taskId) {
    return taskRepository
        .findByIdAndUserId(taskId, userId)
        .orElseThrow(
            () ->
                new FieldValidationException(
                    "Task is not available", List.of(new FieldProblem("taskId", "INVALID_TASK"))));
  }
}
