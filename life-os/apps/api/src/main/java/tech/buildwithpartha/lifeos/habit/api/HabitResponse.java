package tech.buildwithpartha.lifeos.habit.api;

import java.time.Instant;
import java.time.LocalTime;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.habit.domain.Habit;

/** Response DTO representing a Habit (LOS-1209). */
public record HabitResponse(
    UUID id,
    UUID userId,
    String name,
    Optional<String> description,
    String cadence,
    int targetCount,
    String timeZone,
    Optional<String> color,
    boolean reminderEnabled,
    Optional<LocalTime> reminderTime,
    boolean archived,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static HabitResponse fromDomain(Habit domain) {
    Objects.requireNonNull(domain, "domain must not be null");
    return new HabitResponse(
        domain.id(),
        domain.userId(),
        domain.name(),
        domain.description(),
        domain.cadence().name(),
        domain.targetCount(),
        domain.timeZone(),
        domain.color(),
        domain.reminderEnabled(),
        domain.reminderTime(),
        domain.archived(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }
}
