package tech.buildwithpartha.lifeos.sprint.api;

import java.time.LocalDate;
import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanItem;

public record WeeklyPlanItemResponse(
    UUID id,
    UUID taskId,
    UUID outcomeId,
    LocalDate plannedDate,
    int plannedMinutes,
    int position,
    String taskTitleSnapshot,
    String taskStatusSnapshot) {
  static WeeklyPlanItemResponse fromDomain(WeeklyPlanItem item) {
    return new WeeklyPlanItemResponse(
        item.id(),
        item.taskId(),
        item.outcomeId().orElse(null),
        item.plannedDate().orElse(null),
        item.plannedMinutes(),
        item.position(),
        item.taskTitleSnapshot(),
        item.taskStatusSnapshot());
  }
}
