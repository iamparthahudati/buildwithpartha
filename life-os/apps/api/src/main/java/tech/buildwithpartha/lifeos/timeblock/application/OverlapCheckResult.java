package tech.buildwithpartha.lifeos.timeblock.application;

import java.util.List;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;

/** Result object carrying overlap status and conflicting time blocks. */
public record OverlapCheckResult(boolean hasConflict, List<TimeBlock> conflictingBlocks) {

  public OverlapCheckResult {
    conflictingBlocks = conflictingBlocks == null ? List.of() : List.copyOf(conflictingBlocks);
  }
}
