package tech.buildwithpartha.lifeos.goal.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Immutable domain aggregate representing a Goal with progress calculation invariants. */
public record Goal(
    UUID id,
    UUID userId,
    String title,
    Optional<String> description,
    String category,
    GoalProgressType progressType,
    Optional<BigDecimal> targetValue,
    BigDecimal currentValue,
    Optional<String> unit,
    Optional<LocalDate> targetDate,
    GoalStatus status,
    CheckInCadence checkInCadence,
    boolean archived,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public Goal {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(description, "description must not be null");
    Objects.requireNonNull(category, "category must not be null");
    Objects.requireNonNull(progressType, "progressType must not be null");
    Objects.requireNonNull(targetValue, "targetValue must not be null");
    Objects.requireNonNull(currentValue, "currentValue must not be null");
    Objects.requireNonNull(unit, "unit must not be null");
    Objects.requireNonNull(targetDate, "targetDate must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(checkInCadence, "checkInCadence must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");

    if (title.isBlank()) {
      throw new IllegalArgumentException("Goal title must not be blank");
    }
    if (category.isBlank()) {
      throw new IllegalArgumentException("Goal category must not be blank");
    }
    if (currentValue.compareTo(BigDecimal.ZERO) < 0) {
      throw new IllegalArgumentException("Goal currentValue must not be negative");
    }
    targetValue.ifPresent(
        tv -> {
          if (tv.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Goal targetValue must be positive");
          }
        });
    if (progressType == GoalProgressType.NUMERIC && targetValue.isEmpty()) {
      throw new IllegalArgumentException("NUMERIC goals require a targetValue");
    }
  }

  /**
   * Returns the effective target value for calculation, providing defaults for types where target
   * is optional.
   */
  public BigDecimal effectiveTargetValue() {
    return targetValue.orElseGet(
        () ->
            switch (progressType) {
              case PERCENTAGE -> BigDecimal.valueOf(100);
              case BINARY -> BigDecimal.ONE;
              case MILESTONE, NUMERIC -> BigDecimal.valueOf(100);
            });
  }

  /** Calculates current progress percentage as a value between 0.00 and 100.00%. */
  public BigDecimal calculateProgressPercentage() {
    if (progressType == GoalProgressType.BINARY) {
      BigDecimal target = effectiveTargetValue();
      return currentValue.compareTo(target) >= 0
          ? BigDecimal.valueOf(100).setScale(2, RoundingMode.HALF_UP)
          : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    BigDecimal target = effectiveTargetValue();
    if (target.compareTo(BigDecimal.ZERO) <= 0) {
      return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    BigDecimal rawPercentage =
        currentValue.multiply(BigDecimal.valueOf(100)).divide(target, 4, RoundingMode.HALF_UP);

    if (rawPercentage.compareTo(BigDecimal.valueOf(100)) > 0) {
      return BigDecimal.valueOf(100).setScale(2, RoundingMode.HALF_UP);
    }
    if (rawPercentage.compareTo(BigDecimal.ZERO) < 0) {
      return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }
    return rawPercentage.setScale(2, RoundingMode.HALF_UP);
  }

  /** Returns true if this goal has reached completed status. */
  public boolean isCompleted() {
    return status == GoalStatus.COMPLETED;
  }

  /** Returns true if this goal belongs to the specified user ID. */
  public boolean isOwnedBy(UUID ownerId) {
    Objects.requireNonNull(ownerId, "ownerId must not be null");
    return userId.equals(ownerId);
  }
}
