package tech.buildwithpartha.lifeos.sprint.api;

import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanOutcome;

public record WeeklyPlanOutcomeResponse(UUID id, String title, int position) {
  static WeeklyPlanOutcomeResponse fromDomain(WeeklyPlanOutcome outcome) {
    return new WeeklyPlanOutcomeResponse(outcome.id(), outcome.title(), outcome.position());
  }
}
