package tech.buildwithpartha.lifeos.sprint.domain;

import java.util.Objects;
import java.util.UUID;

public record WeeklyPlanOutcome(UUID id, String title, int position) {
  public WeeklyPlanOutcome {
    Objects.requireNonNull(id);
    Objects.requireNonNull(title);
    if (title.isBlank()) {
      throw new IllegalArgumentException("Weekly Plan outcome must not be blank");
    }
  }
}
