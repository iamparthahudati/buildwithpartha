package tech.buildwithpartha.lifeos.common.project;

import java.util.UUID;

/** Domain-neutral contract for validating a project selected by an owning user. */
public interface ProjectOwnershipValidator {

  /** Validates that the project belongs to the user and is available for new task assignment. */
  void validateAssignment(UUID userId, UUID projectId);
}
