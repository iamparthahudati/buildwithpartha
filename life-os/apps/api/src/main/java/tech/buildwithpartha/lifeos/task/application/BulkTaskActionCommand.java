package tech.buildwithpartha.lifeos.task.application;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

/** Validated bulk action parameters shared by every selected task. */
public record BulkTaskActionCommand(
    BulkTaskActionType action,
    TaskStatus status,
    TaskPriority priority,
    Optional<UUID> projectId,
    UUID labelId,
    Optional<Instant> dueAt) {

  public BulkTaskActionCommand {
    Objects.requireNonNull(action, "action must not be null");
    Objects.requireNonNull(projectId, "projectId must not be null");
    Objects.requireNonNull(dueAt, "dueAt must not be null");
  }
}
