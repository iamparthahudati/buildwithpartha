package tech.buildwithpartha.lifeos.habit.domain;

/**
 * The computed streak and cadence metrics for a Habit over a requested date window, as defined by
 * LOS-1210.
 *
 * <p>All counts are scoped to the {@code [from, to]} window passed to {@link
 * HabitStreakCalculator#calculate}. Paused periods (every day of the period covered by at least one
 * {@link HabitPausePeriod}) are excluded from both the eligibility denominator and streak
 * evaluation.
 *
 * @param currentStreak consecutive eligible periods ending at the last date in the window that each
 *     met {@code habit.targetCount()}; resets to 0 on the first miss scanning backwards
 * @param longestStreak longest contiguous run of eligible periods that met the target within the
 *     window
 * @param eligiblePeriods number of cadence periods in the window that are not fully paused
 * @param metTargetPeriods number of eligible periods where the sum of recorded {@code
 *     completedCount} values is {@code >= habit.targetCount()}
 * @param completionRate {@code metTargetPeriods / eligiblePeriods} in {@code [0.0, 1.0]}; exactly
 *     {@code 0.0} when {@code eligiblePeriods == 0}
 */
public record HabitStreakResult(
    int currentStreak,
    int longestStreak,
    int eligiblePeriods,
    int metTargetPeriods,
    double completionRate) {

  public HabitStreakResult {
    if (currentStreak < 0) {
      throw new IllegalArgumentException("currentStreak must not be negative");
    }
    if (longestStreak < 0) {
      throw new IllegalArgumentException("longestStreak must not be negative");
    }
    if (eligiblePeriods < 0) {
      throw new IllegalArgumentException("eligiblePeriods must not be negative");
    }
    if (metTargetPeriods < 0) {
      throw new IllegalArgumentException("metTargetPeriods must not be negative");
    }
    if (metTargetPeriods > eligiblePeriods) {
      throw new IllegalArgumentException("metTargetPeriods must not exceed eligiblePeriods");
    }
    if (completionRate < 0.0 || completionRate > 1.0) {
      throw new IllegalArgumentException("completionRate must be in [0.0, 1.0]");
    }
  }
}
