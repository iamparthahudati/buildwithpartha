package tech.buildwithpartha.lifeos.common.user;

import java.time.DayOfWeek;
import java.time.ZoneId;
import java.util.Objects;

/** Account-owned timezone and week boundary settings used by planning domains. */
public record UserPlanningContext(ZoneId timeZone, DayOfWeek weekStart) {
  public UserPlanningContext {
    Objects.requireNonNull(timeZone);
    Objects.requireNonNull(weekStart);
  }
}
