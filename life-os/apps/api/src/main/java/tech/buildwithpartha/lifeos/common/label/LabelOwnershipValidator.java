package tech.buildwithpartha.lifeos.common.label;

import java.util.Collection;
import java.util.UUID;

/** Domain-neutral contract to validate that a set of labels belongs to a specific user. */
public interface LabelOwnershipValidator {

  /**
   * Validates that all provided label IDs belong to the specified user. Throws an exception if any
   * label ID is invalid or belongs to another user.
   *
   * @param userId the ID of the user owning the resource
   * @param labelIds the set of label IDs to validate
   */
  void validateOwnership(UUID userId, Collection<UUID> labelIds);
}
