package tech.buildwithpartha.lifeos.goal.api;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import tech.buildwithpartha.lifeos.goal.domain.GoalLink;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkTargetType;

/** Response DTO representing a Goal link. */
public record GoalLinkResponse(
    UUID id,
    UUID goalId,
    UUID userId,
    GoalLinkTargetType targetType,
    UUID targetId,
    Instant createdAt) {

  public static GoalLinkResponse fromDomain(GoalLink domain) {
    Objects.requireNonNull(domain, "domain must not be null");
    return new GoalLinkResponse(
        domain.id(),
        domain.goalId(),
        domain.userId(),
        domain.targetType(),
        domain.targetId(),
        domain.createdAt());
  }
}
