package tech.buildwithpartha.lifeos.habit.application;

import java.time.LocalDate;
import java.util.Objects;

/**
 * Window-based aggregate statistics for a habit (LOS-1209). Streak and cadence-eligibility math is
 * intentionally out of scope here — that is defined in LOS-1210. These figures are plain counts
 * over an inclusive {@code [from, to]} local-date window.
 *
 * @param totalDays number of calendar days in the inclusive window
 * @param daysWithEntry days that have at least one recorded completion
 * @param daysMeetingTarget days whose completed count reached the habit's per-period target
 * @param totalCompletions sum of completed counts across the window
 * @param completionRate {@code daysMeetingTarget / totalDays}, in {@code [0.0, 1.0]}
 */
public record HabitStatistics(
    LocalDate from,
    LocalDate to,
    long totalDays,
    long daysWithEntry,
    long daysMeetingTarget,
    long totalCompletions,
    double completionRate) {

  public HabitStatistics {
    Objects.requireNonNull(from, "from must not be null");
    Objects.requireNonNull(to, "to must not be null");
  }
}
