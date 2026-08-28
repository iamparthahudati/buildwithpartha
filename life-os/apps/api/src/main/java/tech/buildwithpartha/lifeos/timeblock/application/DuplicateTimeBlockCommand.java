package tech.buildwithpartha.lifeos.timeblock.application;

import java.time.Instant;
import java.util.Optional;

/** Command parameters for duplicating an existing TimeBlock. */
public record DuplicateTimeBlockCommand(
    Optional<Instant> startAt, Optional<Instant> endAt, boolean allowOverlap) {

  public DuplicateTimeBlockCommand {
    startAt = startAt == null ? Optional.empty() : startAt;
    endAt = endAt == null ? Optional.empty() : endAt;
  }
}
