package tech.buildwithpartha.lifeos.sprint.api;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewItemDecision;

public record ReviewItemDecisionResponse(
    UUID id,
    String itemType,
    UUID itemId,
    String action,
    Optional<LocalDate> targetDate,
    Optional<String> notes) {
  public static ReviewItemDecisionResponse fromDomain(ReviewItemDecision decision) {
    return new ReviewItemDecisionResponse(
        decision.id(),
        decision.itemType(),
        decision.itemId(),
        decision.action(),
        decision.targetDate(),
        decision.notes());
  }
}
