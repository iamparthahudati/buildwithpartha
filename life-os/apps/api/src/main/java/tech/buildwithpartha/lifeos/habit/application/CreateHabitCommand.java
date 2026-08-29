package tech.buildwithpartha.lifeos.habit.application;

import java.time.LocalTime;
import java.util.Objects;
import java.util.Optional;
import tech.buildwithpartha.lifeos.habit.domain.HabitCadence;

/** Command payload for creating a new Habit (LOS-1209). */
public record CreateHabitCommand(
    String name,
    Optional<String> description,
    HabitCadence cadence,
    int targetCount,
    String timeZone,
    Optional<String> color,
    boolean reminderEnabled,
    Optional<LocalTime> reminderTime) {

  public CreateHabitCommand {
    Objects.requireNonNull(name, "name must not be null");
    Objects.requireNonNull(description, "description must not be null");
    Objects.requireNonNull(cadence, "cadence must not be null");
    Objects.requireNonNull(timeZone, "timeZone must not be null");
    Objects.requireNonNull(color, "color must not be null");
    Objects.requireNonNull(reminderTime, "reminderTime must not be null");
  }
}
