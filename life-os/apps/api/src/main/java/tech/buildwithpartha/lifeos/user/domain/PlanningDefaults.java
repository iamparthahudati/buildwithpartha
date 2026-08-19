package tech.buildwithpartha.lifeos.user.domain;

import java.time.LocalTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** User planning and focus defaults (LOS-0513, 25-ONBOARDING-SPECIFICATION.md). */
public record PlanningDefaults(
    List<Integer> workingDays,
    Optional<LocalTime> workStartTime,
    Optional<LocalTime> workEndTime,
    boolean overnightSchedule,
    Optional<Integer> dailyFocusTargetMinutes,
    int focusDurationMinutes,
    int breakDurationMinutes) {

  public static final List<Integer> DEFAULT_WORKING_DAYS = List.of(1, 2, 3, 4, 5);
  public static final int DEFAULT_FOCUS_DURATION_MINUTES = 25;
  public static final int DEFAULT_BREAK_DURATION_MINUTES = 5;

  public PlanningDefaults {
    Objects.requireNonNull(workingDays, "workingDays must not be null");
    Objects.requireNonNull(workStartTime, "workStartTime must not be null");
    Objects.requireNonNull(workEndTime, "workEndTime must not be null");
    Objects.requireNonNull(dailyFocusTargetMinutes, "dailyFocusTargetMinutes must not be null");

    for (Integer day : workingDays) {
      if (day == null || day < 1 || day > 7) {
        throw new IllegalArgumentException("workingDays elements must be between 1 and 7");
      }
    }
    if (focusDurationMinutes <= 0 || focusDurationMinutes > 1440) {
      throw new IllegalArgumentException("focusDurationMinutes must be between 1 and 1440");
    }
    if (breakDurationMinutes <= 0 || breakDurationMinutes > 1440) {
      throw new IllegalArgumentException("breakDurationMinutes must be between 1 and 1440");
    }
    dailyFocusTargetMinutes.ifPresent(
        target -> {
          if (target <= 0 || target > 1440) {
            throw new IllegalArgumentException(
                "dailyFocusTargetMinutes must be between 1 and 1440");
          }
        });
    workingDays = workingDays.stream().distinct().sorted().toList();
  }

  public static PlanningDefaults standardDefaults() {
    return new PlanningDefaults(
        DEFAULT_WORKING_DAYS,
        Optional.empty(),
        Optional.empty(),
        false,
        Optional.empty(),
        DEFAULT_FOCUS_DURATION_MINUTES,
        DEFAULT_BREAK_DURATION_MINUTES);
  }
}
