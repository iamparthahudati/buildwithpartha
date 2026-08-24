package tech.buildwithpartha.lifeos.focus.application;

import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Validated input for starting one server-authoritative Focus Session. */
public record StartFocusSessionCommand(
    Optional<UUID> taskId,
    Optional<UUID> timeBlockId,
    Duration plannedFocusDuration,
    Duration plannedBreakDuration) {

  public StartFocusSessionCommand {
    Objects.requireNonNull(taskId, "taskId must not be null");
    Objects.requireNonNull(timeBlockId, "timeBlockId must not be null");
    Objects.requireNonNull(plannedFocusDuration, "plannedFocusDuration must not be null");
    Objects.requireNonNull(plannedBreakDuration, "plannedBreakDuration must not be null");
    if (plannedFocusDuration.isZero()
        || plannedFocusDuration.isNegative()
        || plannedFocusDuration.compareTo(Duration.ofHours(24)) > 0) {
      throw new IllegalArgumentException(
          "plannedFocusDuration must be between 1 second and 24 hours");
    }
    if (plannedBreakDuration.isNegative()
        || plannedBreakDuration.compareTo(Duration.ofHours(8)) > 0) {
      throw new IllegalArgumentException("plannedBreakDuration must be between zero and 8 hours");
    }
  }
}
