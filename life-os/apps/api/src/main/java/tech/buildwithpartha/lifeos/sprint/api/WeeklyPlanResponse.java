package tech.buildwithpartha.lifeos.sprint.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.application.WeeklyPlanView;

public record WeeklyPlanResponse(
    UUID id,
    LocalDate weekStartDate,
    LocalDate weekEndDate,
    String timeZone,
    int weekStartDay,
    int revision,
    String status,
    UUID predecessorPlanId,
    Instant finalizedAt,
    List<WeeklyPlanCapacityResponse> capacities,
    List<WeeklyPlanOutcomeResponse> outcomes,
    List<WeeklyPlanItemResponse> items,
    WeeklyPlanConflictResponse conflictSummary,
    Instant createdAt,
    Instant updatedAt,
    long version) {
  static WeeklyPlanResponse fromView(WeeklyPlanView view) {
    var plan = view.plan();
    return new WeeklyPlanResponse(
        plan.id(),
        plan.weekStartDate(),
        plan.weekEndDate(),
        plan.timeZone(),
        plan.weekStartDay(),
        plan.revision(),
        plan.status().name(),
        plan.predecessorPlanId().orElse(null),
        plan.finalizedAt().orElse(null),
        plan.capacities().stream().map(WeeklyPlanCapacityResponse::fromDomain).toList(),
        plan.outcomes().stream().map(WeeklyPlanOutcomeResponse::fromDomain).toList(),
        plan.items().stream().map(WeeklyPlanItemResponse::fromDomain).toList(),
        WeeklyPlanConflictResponse.fromDomain(view.conflictSummary()),
        plan.createdAt(),
        plan.updatedAt(),
        plan.version());
  }
}
