package tech.buildwithpartha.lifeos.task.application;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.task.SprintTaskPort;
import tech.buildwithpartha.lifeos.common.task.SprintTaskSummary;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

/** Task-owned adapter exposing only the data Sprint planning needs. */
@Service
public class DefaultSprintTaskPort implements SprintTaskPort {
  private final TaskRepository repository;

  public DefaultSprintTaskPort(TaskRepository repository) {
    this.repository = repository;
  }

  @Override
  public SprintTaskSummary getAvailableTask(UUID userId, UUID taskId) {
    Task task = owned(userId, taskId);
    if (task.isArchived() || task.isDeleted() || task.status().isTerminal()) {
      throw new FieldValidationException(
          "Task is not available for Sprint commitment",
          List.of(new FieldProblem("taskId", "TASK_NOT_AVAILABLE")));
    }
    return summary(task);
  }

  @Override
  public SprintTaskSummary getTask(UUID userId, UUID taskId) {
    return summary(owned(userId, taskId));
  }

  private Task owned(UUID userId, UUID taskId) {
    return repository
        .findByIdAndUserId(taskId, userId)
        .filter(task -> !task.isDeleted())
        .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
  }

  private static SprintTaskSummary summary(Task task) {
    return new SprintTaskSummary(
        task.id(), task.title(), task.status().name(), task.status().isTerminal());
  }
}
