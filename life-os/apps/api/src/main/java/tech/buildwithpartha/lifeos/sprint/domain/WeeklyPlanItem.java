package tech.buildwithpartha.lifeos.sprint.domain;

import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public record WeeklyPlanItem(
    UUID id,
    UUID taskId,
    Optional<UUID> outcomeId,
    Optional<LocalDate> plannedDate,
    int plannedMinutes,
    int position,
    String taskTitleSnapshot,
    String taskStatusSnapshot) {
  public WeeklyPlanItem {
    Objects.requireNonNull(id);
    Objects.requireNonNull(taskId);
    Objects.requireNonNull(outcomeId);
    Objects.requireNonNull(plannedDate);
    Objects.requireNonNull(taskTitleSnapshot);
    Objects.requireNonNull(taskStatusSnapshot);
    if (plannedMinutes < 0 || plannedMinutes > 1440) {
      throw new IllegalArgumentException("Weekly Plan item minutes must be between 0 and 1440");
    }
  }
}
