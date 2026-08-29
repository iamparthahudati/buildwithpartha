package tech.buildwithpartha.lifeos.habit.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;

/**
 * Request body for setting the absolute completed count on a local date. {@code date} defaults to
 * the habit's own "today" when omitted (LOS-1209).
 */
public record SetHabitEntryRequest(
    @NotNull(message = "REQUIRED") @Positive(message = "INVALID") Integer count, LocalDate date) {}
