package tech.buildwithpartha.lifeos.sprint.api;

import java.time.LocalDate;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanCapacity;

public record WeeklyPlanCapacityResponse(LocalDate localDate, int availableMinutes) {
  static WeeklyPlanCapacityResponse fromDomain(WeeklyPlanCapacity capacity) {
    return new WeeklyPlanCapacityResponse(capacity.localDate(), capacity.availableMinutes());
  }
}
