package tech.buildwithpartha.lifeos.timeblock.api;

import java.util.List;
import tech.buildwithpartha.lifeos.timeblock.application.OverlapCheckResult;

/** Response payload for preflight overlap check. */
public record TimeBlockOverlapResponse(
    boolean hasConflict, List<TimeBlockResponse> conflictingBlocks) {

  public static TimeBlockOverlapResponse fromResult(OverlapCheckResult result) {
    List<TimeBlockResponse> blocks =
        result.conflictingBlocks().stream().map(TimeBlockResponse::fromDomain).toList();
    return new TimeBlockOverlapResponse(result.hasConflict(), blocks);
  }
}
