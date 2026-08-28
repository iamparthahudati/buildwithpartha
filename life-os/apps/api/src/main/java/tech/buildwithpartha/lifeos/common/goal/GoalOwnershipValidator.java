package tech.buildwithpartha.lifeos.common.goal;

import java.util.UUID;

/** Domain-neutral contract for validating a goal selected by an owning user. */
public interface GoalOwnershipValidator {

  /** Validates that the goal belongs to the user. */
  void validateAssignment(UUID userId, UUID goalId);
}
