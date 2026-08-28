package tech.buildwithpartha.lifeos.sprint.api;

import java.time.LocalDate;
import java.util.List;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanConflictSummary;

public record WeeklyPlanConflictResponse(
    boolean hasWarnings,
    int totalPlannedMinutes,
    int totalCapacityMinutes,
    int overcapacityMinutes,
    List<LocalDate> overcapacityDates,
    int overlappingTimeBlockCount,
    int unscheduledItemCount,
    int outcomesWithoutItemsCount) {
  static WeeklyPlanConflictResponse fromDomain(WeeklyPlanConflictSummary summary) {
    return new WeeklyPlanConflictResponse(
        summary.hasWarnings(),
        summary.totalPlannedMinutes(),
        summary.totalCapacityMinutes(),
        summary.overcapacityMinutes(),
        summary.overcapacityDates(),
        summary.overlappingTimeBlockCount(),
        summary.unscheduledItemCount(),
        summary.outcomesWithoutItemsCount());
  }
}
