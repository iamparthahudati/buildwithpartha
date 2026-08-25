package tech.buildwithpartha.lifeos.goal.domain;

import java.util.List;
import java.util.Objects;

/** Immutable result wrapper holding paginated Goals and total item count. */
public record GoalQueryResult(List<Goal> goals, long totalItems) {

  public GoalQueryResult {
    Objects.requireNonNull(goals, "goals must not be null");
    goals = List.copyOf(goals);
    if (totalItems < 0) {
      throw new IllegalArgumentException("totalItems must not be negative");
    }
  }
}
