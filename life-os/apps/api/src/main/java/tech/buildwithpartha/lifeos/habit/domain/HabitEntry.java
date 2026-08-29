package tech.buildwithpartha.lifeos.habit.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/**
 * Immutable domain record representing a dated habit completion. Uniqueness is by ({@code habitId},
 * {@code localDate}) — one entry per habit per local calendar date — so recording another
 * completion on the same date increments {@link #completedCount} rather than inserting a duplicate.
 */
public record HabitEntry(
    UUID id,
    UUID habitId,
    UUID userId,
    LocalDate localDate,
    int completedCount,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public HabitEntry {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(habitId, "habitId must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(localDate, "localDate must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");

    if (completedCount <= 0) {
      throw new IllegalArgumentException("HabitEntry completedCount must be positive");
    }
  }

  public boolean isOwnedBy(UUID candidateUserId) {
    return userId.equals(candidateUserId);
  }

  public HabitEntry withCount(int newCount, Instant now) {
    return new HabitEntry(id, habitId, userId, localDate, newCount, createdAt, now, version);
  }

  public HabitEntry increment(int by, Instant now) {
    if (by <= 0) {
      throw new IllegalArgumentException("HabitEntry increment must be positive");
    }
    return new HabitEntry(
        id, habitId, userId, localDate, completedCount + by, createdAt, now, version);
  }
}
