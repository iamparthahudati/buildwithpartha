package tech.buildwithpartha.lifeos.task.application;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.task.TaskOwnershipValidator;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

/** Task-owned implementation of the domain-neutral assignment validation contract. */
@Service
public class DefaultTaskOwnershipValidator implements TaskOwnershipValidator {

  private final TaskRepository taskRepository;

  public DefaultTaskOwnershipValidator(TaskRepository taskRepository) {
    this.taskRepository = taskRepository;
  }

  @Override
  public void validateAssignment(UUID userId, UUID taskId) {
    Task task =
        taskRepository
            .findByIdAndUserId(taskId, userId)
            .orElseThrow(
                () ->
                    new FieldValidationException(
                        "Validation failed", List.of(new FieldProblem("taskId", "INVALID_TASK"))));
    if (task.archivedAt().isPresent()) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("taskId", "ARCHIVED_TASK")));
    }
  }
}
