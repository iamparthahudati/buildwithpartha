package tech.buildwithpartha.lifeos.habit.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Request body for opening a habit pause period. An absent {@code endDate} is open-ended. */
public record CreateHabitPauseRequest(
    @NotNull(message = "REQUIRED") LocalDate startDate,
    LocalDate endDate,
    @Size(max = 500, message = "TOO_LONG") String reason) {}
