package tech.buildwithpartha.lifeos.habit.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalTime;
import java.util.Optional;
import tech.buildwithpartha.lifeos.habit.application.CreateHabitCommand;
import tech.buildwithpartha.lifeos.habit.domain.HabitCadence;

/** Request body for creating a Habit. Cadence/timezone/reminder are validated in the controller. */
public record CreateHabitRequest(
    @NotBlank(message = "REQUIRED") @Size(max = 200, message = "TOO_LONG") String name,
    @Size(max = 2000, message = "TOO_LONG") String description,
    @NotBlank(message = "REQUIRED") String cadence,
    @Positive(message = "INVALID") int targetCount,
    @NotBlank(message = "REQUIRED") String timeZone,
    @Size(max = 32, message = "TOO_LONG") String color,
    boolean reminderEnabled,
    LocalTime reminderTime) {

  public CreateHabitCommand toCommand(HabitCadence parsedCadence) {
    return new CreateHabitCommand(
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
