package tech.buildwithpartha.lifeos.habit.domain;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Immutable domain aggregate representing a Habit with cadence, per-period target count, an IANA
 * timezone, and reminder invariants. The timezone is what makes streak calculation deterministic:
 * completions are bucketed into the habit's own local calendar date via {@link #localDateFor}.
 */
public record Habit(
    UUID id,
    UUID userId,
    String name,
    Optional<String> description,
    HabitCadence cadence,
    int targetCount,
    String timeZone,
    Optional<String> color,
    boolean reminderEnabled,
    Optional<LocalTime> reminderTime,
    boolean archived,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public Habit {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(name, "name must not be null");
    Objects.requireNonNull(description, "description must not be null");
    Objects.requireNonNull(cadence, "cadence must not be null");
    Objects.requireNonNull(timeZone, "timeZone must not be null");
    Objects.requireNonNull(color, "color must not be null");
    Objects.requireNonNull(reminderTime, "reminderTime must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");

    if (name.isBlank()) {
      throw new IllegalArgumentException("Habit name must not be blank");
    }
    if (targetCount <= 0) {
      throw new IllegalArgumentException("Habit targetCount must be positive");
    }
    if (timeZone.isBlank()) {
      throw new IllegalArgumentException("Habit timeZone must not be blank");
    }
    try {
      ZoneId.of(timeZone);
    } catch (DateTimeException exception) {
      throw new IllegalArgumentException("Habit timeZone must be a valid IANA zone id", exception);
    }
    if (reminderEnabled && reminderTime.isEmpty()) {
      throw new IllegalArgumentException("Habit with reminder enabled must set a reminderTime");
    }
  }

  /** The resolved zone for this habit; always valid because the constructor validates it. */
  public ZoneId zoneId() {
    return ZoneId.of(timeZone);
  }

  /** The habit's local calendar date at the given instant, used to bucket completions. */
  public LocalDate localDateFor(Instant instant) {
    Objects.requireNonNull(instant, "instant must not be null");
    return instant.atZone(zoneId()).toLocalDate();
  }

  public boolean isOwnedBy(UUID candidateUserId) {
    return userId.equals(candidateUserId);
  }

  public Habit withDetails(
      String newName,
      Optional<String> newDescription,
      HabitCadence newCadence,
      int newTargetCount,
      String newTimeZone,
      Optional<String> newColor,
      boolean newReminderEnabled,
      Optional<LocalTime> newReminderTime,
      Instant now) {
    return new Habit(
        id,
        userId,
        newName,
        newDescription,
        newCadence,
        newTargetCount,
        newTimeZone,
        newColor,
        newReminderEnabled,
        newReminderTime,
        archived,
        createdAt,
        now,
        version);
  }

  public Habit archive(Instant now) {
    return new Habit(
        id,
        userId,
        name,
        description,
        cadence,
        targetCount,
        timeZone,
        color,
        reminderEnabled,
        reminderTime,
        true,
        createdAt,
        now,
        version);
  }

  public Habit restore(Instant now) {
    return new Habit(
        id,
        userId,
        name,
        description,
        cadence,
        targetCount,
        timeZone,
        color,
        reminderEnabled,
        reminderTime,
        false,
        createdAt,
        now,
        version);
  }
}
