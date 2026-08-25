package tech.buildwithpartha.lifeos.sprint.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

public record WeeklyPlanConflictSummary(
    int totalPlannedMinutes,
    int totalCapacityMinutes,
    int overcapacityMinutes,
    List<LocalDate> overcapacityDates,
    int overlappingTimeBlockCount,
    int unscheduledItemCount,
    int outcomesWithoutItemsCount) {
  public WeeklyPlanConflictSummary {
    Objects.requireNonNull(overcapacityDates);
    overcapacityDates = List.copyOf(overcapacityDates);
  }

  public boolean hasWarnings() {
    return overcapacityMinutes > 0
        || overlappingTimeBlockCount > 0
        || unscheduledItemCount > 0
        || outcomesWithoutItemsCount > 0;
  }
}
