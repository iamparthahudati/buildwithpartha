package tech.buildwithpartha.lifeos.habit.api;

import jakarta.validation.constraints.PositiveOrZero;

/** Request body carrying an optimistic-lock version for state-transition endpoints (LOS-1209). */
public record HabitVersionRequest(@PositiveOrZero(message = "INVALID") long version) {}
