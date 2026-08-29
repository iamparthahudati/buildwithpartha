package tech.buildwithpartha.lifeos.task.application;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.task.WeeklyPlanTaskPort;
import tech.buildwithpartha.lifeos.common.task.WeeklyPlanTaskSummary;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

/** Task-owned adapter exposing allocation-safe data to Weekly Plans. */
@Service
public class DefaultWeeklyPlanTaskPort implements WeeklyPlanTaskPort {
  private final TaskRepository repository;

  public DefaultWeeklyPlanTaskPort(TaskRepository repository) {
    this.repository = repository;
  }

  @Override
  public WeeklyPlanTaskSummary getAvailableTask(UUID userId, UUID taskId) {
    Task task = owned(userId, taskId);
    if (task.isArchived() || task.isDeleted() || task.status().isTerminal()) {
      throw new FieldValidationException(
          "Task is not available for Weekly Plan allocation",
          List.of(new FieldProblem("taskId", "TASK_NOT_AVAILABLE")));
    }
    return summary(task);
  }

  @Override
  public WeeklyPlanTaskSummary getTask(UUID userId, UUID taskId) {
    return summary(owned(userId, taskId));
  }

  private Task owned(UUID userId, UUID taskId) {
    return repository
        .findByIdAndUserId(taskId, userId)
        .filter(task -> !task.isDeleted())
        .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
  }

  private static WeeklyPlanTaskSummary summary(Task task) {
    return new WeeklyPlanTaskSummary(
        task.id(), task.title(), task.status().name(), task.status().isTerminal());
  }
}
