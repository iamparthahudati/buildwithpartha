package tech.buildwithpartha.lifeos.user.application;

import java.util.Objects;
import java.util.Optional;

/** Command to record Step 2 (Time and week) preferences. */
public record UpdateTimeAndWeekStepCommand(
    String timeZone, Optional<String> locale, Optional<Integer> weekStart) {

  public UpdateTimeAndWeekStepCommand {
    Objects.requireNonNull(timeZone, "timeZone must not be null");
    Objects.requireNonNull(locale, "locale must not be null");
    Objects.requireNonNull(weekStart, "weekStart must not be null");
  }
}
