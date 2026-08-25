package tech.buildwithpartha.lifeos.goal.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckIn;

/** Response DTO representing a Goal check-in. */
public record GoalCheckInResponse(
    UUID id,
    UUID goalId,
    UUID userId,
    BigDecimal value,
    String note,
    Instant recordedAt,
    Instant createdAt) {

  public static GoalCheckInResponse fromDomain(GoalCheckIn domain) {
    Objects.requireNonNull(domain, "domain must not be null");
    return new GoalCheckInResponse(
        domain.id(),
        domain.goalId(),
        domain.userId(),
        domain.value(),
        domain.note().orElse(null),
        domain.recordedAt(),
        domain.createdAt());
  }
}
