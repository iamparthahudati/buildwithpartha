package tech.buildwithpartha.lifeos.user.application;

import java.time.LocalTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** Command to record Step 3 (Planning defaults) preferences or explicitly skip it. */
public record UpdatePlanningDefaultsStepCommand(
    Optional<List<Integer>> workingDays,
    Optional<LocalTime> workStartTime,
    Optional<LocalTime> workEndTime,
    Optional<Boolean> overnightSchedule,
    Optional<Integer> dailyFocusTargetMinutes,
    Optional<Integer> focusDurationMinutes,
    Optional<Integer> breakDurationMinutes,
    boolean skipped) {

  public UpdatePlanningDefaultsStepCommand {
    Objects.requireNonNull(workingDays, "workingDays must not be null");
    Objects.requireNonNull(workStartTime, "workStartTime must not be null");
    Objects.requireNonNull(workEndTime, "workEndTime must not be null");
    Objects.requireNonNull(overnightSchedule, "overnightSchedule must not be null");
    Objects.requireNonNull(dailyFocusTargetMinutes, "dailyFocusTargetMinutes must not be null");
    Objects.requireNonNull(focusDurationMinutes, "focusDurationMinutes must not be null");
    Objects.requireNonNull(breakDurationMinutes, "breakDurationMinutes must not be null");
  }
}
