package tech.buildwithpartha.lifeos.task.application;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.Task;

/** Outcome for one selected task in a partial-result bulk response. */
public record BulkTaskItemResult(UUID taskId, Optional<Task> task, Optional<String> errorCode) {

  public BulkTaskItemResult {
    Objects.requireNonNull(taskId, "taskId must not be null");
    Objects.requireNonNull(task, "task must not be null");
    Objects.requireNonNull(errorCode, "errorCode must not be null");
    if (task.isPresent() == errorCode.isPresent()) {
      throw new IllegalArgumentException("exactly one of task or errorCode must be present");
    }
  }

  public static BulkTaskItemResult succeeded(Task task) {
    return new BulkTaskItemResult(task.id(), Optional.of(task), Optional.empty());
  }

  public static BulkTaskItemResult failed(UUID taskId, String errorCode) {
    return new BulkTaskItemResult(taskId, Optional.empty(), Optional.of(errorCode));
  }

  public boolean succeeded() {
    return task.isPresent();
  }
}
