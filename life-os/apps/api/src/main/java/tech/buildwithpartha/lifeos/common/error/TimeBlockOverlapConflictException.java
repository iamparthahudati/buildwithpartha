package tech.buildwithpartha.lifeos.common.error;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Exception thrown when a proposed time block overlaps with existing schedule blocks. */
public final class TimeBlockOverlapConflictException extends CodedException {

  private final List<UUID> conflictingBlockIds;

  public TimeBlockOverlapConflictException(String message, List<UUID> conflictingBlockIds) {
    super(StandardErrorCodes.TIME_BLOCK_OVERLAP_CONFLICT, message);
    this.conflictingBlockIds =
        List.copyOf(
            Objects.requireNonNull(conflictingBlockIds, "conflictingBlockIds must not be null"));
  }

  public List<UUID> conflictingBlockIds() {
    return conflictingBlockIds;
  }
}
