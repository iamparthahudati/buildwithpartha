package tech.buildwithpartha.lifeos.common.time;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Minimal non-cancelled Time Block interval used for overlap warnings. */
public record WeeklyPlanTimeBlock(UUID id, Instant startAt, Instant endAt) {
  public WeeklyPlanTimeBlock {
    Objects.requireNonNull(id);
    Objects.requireNonNull(startAt);
    Objects.requireNonNull(endAt);
  }
}
