package tech.buildwithpartha.lifeos.common.habit;

import java.time.LocalDate;
import java.util.UUID;

/** Domain-neutral Habit projection consumed by the Today aggregation. */
public record HabitTodayProjection(
    UUID id,
    String name,
    String cadence,
    int targetCount,
    int completedCount,
    LocalDate localDate,
    String timeZone,
    boolean paused,
    int currentStreak) {}
