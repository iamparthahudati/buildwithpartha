package tech.buildwithpartha.lifeos.goal.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;

/** Response DTO representing a Goal entity. */
public record GoalResponse(
    UUID id,
    UUID userId,
    String title,
    String description,
    String category,
    GoalProgressType progressType,
    BigDecimal targetValue,
    BigDecimal currentValue,
    String unit,
    LocalDate targetDate,
    GoalStatus status,
    CheckInCadence checkInCadence,
    boolean archived,
    BigDecimal progressPercentage,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static GoalResponse fromDomain(Goal goal) {
    Objects.requireNonNull(goal, "goal must not be null");
    return new GoalResponse(
        goal.id(),
        goal.userId(),
        goal.title(),
        goal.description().orElse(null),
        goal.category(),
        goal.progressType(),
        goal.targetValue().orElse(null),
        goal.currentValue(),
        goal.unit().orElse(null),
        goal.targetDate().orElse(null),
        goal.status(),
        goal.checkInCadence(),
        goal.archived(),
        goal.calculateProgressPercentage(),
        goal.createdAt(),
        goal.updatedAt(),
        goal.version());
  }
}
