package tech.buildwithpartha.lifeos.habit.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalTime;
import java.util.Optional;
import tech.buildwithpartha.lifeos.habit.application.UpdateHabitCommand;
import tech.buildwithpartha.lifeos.habit.domain.HabitCadence;

/**
 * Request body for updating a Habit's details and reminder preferences (carries {@code version}).
 */
public record UpdateHabitRequest(
    @NotBlank(message = "REQUIRED") @Size(max = 200, message = "TOO_LONG") String name,
    @Size(max = 2000, message = "TOO_LONG") String description,
    @NotBlank(message = "REQUIRED") String cadence,
    @Positive(message = "INVALID") int targetCount,
    @NotBlank(message = "REQUIRED") String timeZone,
    @Size(max = 32, message = "TOO_LONG") String color,
    boolean reminderEnabled,
    LocalTime reminderTime,
    @PositiveOrZero(message = "INVALID") long version) {

  public UpdateHabitCommand toCommand(HabitCadence parsedCadence) {
    return new UpdateHabitCommand(
        name,
        Optional.ofNullable(description),
        parsedCadence,
        targetCount,
        timeZone,
        Optional.ofNullable(color),
        reminderEnabled,
        Optional.ofNullable(reminderTime));
  }
}
