package tech.buildwithpartha.lifeos.common.task;

import java.util.UUID;

/** Domain-neutral contract for validating a task selected by an owning user. */
public interface TaskOwnershipValidator {

  /** Validates that the task belongs to the user and is available for time-block assignment. */
  void validateAssignment(UUID userId, UUID taskId);
}
