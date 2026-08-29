package tech.buildwithpartha.lifeos.sprint.domain;

import java.time.LocalDate;
import java.util.Objects;

public record WeeklyPlanCapacity(LocalDate localDate, int availableMinutes) {
  public WeeklyPlanCapacity {
    Objects.requireNonNull(localDate);
    if (availableMinutes < 0 || availableMinutes > 1440) {
      throw new IllegalArgumentException("Weekly Plan capacity must be between 0 and 1440 minutes");
    }
  }
}
