package tech.buildwithpartha.lifeos.goal.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Immutable domain record representing a Goal Check-in progress entry. */
public record GoalCheckIn(
    UUID id,
    UUID goalId,
    UUID userId,
    BigDecimal value,
    Optional<String> note,
    Instant recordedAt,
    Instant createdAt) {

  public GoalCheckIn {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(goalId, "goalId must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(value, "value must not be null");
    Objects.requireNonNull(note, "note must not be null");
    Objects.requireNonNull(recordedAt, "recordedAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");

    if (value.compareTo(BigDecimal.ZERO) < 0) {
      throw new IllegalArgumentException("GoalCheckIn value must not be negative");
    }
  }

  /** Returns true if this check-in belongs to the specified user ID. */
  public boolean isOwnedBy(UUID ownerId) {
    Objects.requireNonNull(ownerId, "ownerId must not be null");
    return userId.equals(ownerId);
  }
}
