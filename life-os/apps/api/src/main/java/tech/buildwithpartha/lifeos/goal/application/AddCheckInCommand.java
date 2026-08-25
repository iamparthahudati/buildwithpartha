package tech.buildwithpartha.lifeos.goal.application;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/** Command carrier for recording a Goal Check-in progress entry. */
public record AddCheckInCommand(
    BigDecimal value, Optional<String> note, Optional<Instant> recordedAt) {

  public AddCheckInCommand {
    Objects.requireNonNull(value, "value must not be null");
    Objects.requireNonNull(note, "note must not be null");
    Objects.requireNonNull(recordedAt, "recordedAt must not be null");
  }
}
