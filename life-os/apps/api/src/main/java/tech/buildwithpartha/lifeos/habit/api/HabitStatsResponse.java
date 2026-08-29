package tech.buildwithpartha.lifeos.habit.api;

import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;
import tech.buildwithpartha.lifeos.habit.application.HabitStatistics;

/** Response DTO for window-based habit statistics (LOS-1209). */
public record HabitStatsResponse(
    UUID habitId,
    LocalDate from,
    LocalDate to,
    long totalDays,
    long daysWithEntry,
    long daysMeetingTarget,
    long totalCompletions,
    double completionRate) {

  public static HabitStatsResponse fromDomain(UUID habitId, HabitStatistics stats) {
    Objects.requireNonNull(habitId, "habitId must not be null");
    Objects.requireNonNull(stats, "stats must not be null");
    return new HabitStatsResponse(
        habitId,
        stats.from(),
        stats.to(),
        stats.totalDays(),
        stats.daysWithEntry(),
        stats.daysMeetingTarget(),
        stats.totalCompletions(),
        stats.completionRate());
  }
}
