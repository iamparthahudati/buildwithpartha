package tech.buildwithpartha.lifeos.goal.domain;

/** Immutable domain summary metrics for a user's goals. */
public record GoalSummaryCounts(
    long totalGoals, long activeGoals, long completedGoals, long pausedGoals, long archivedGoals) {

  public GoalSummaryCounts {
    if (totalGoals < 0
        || activeGoals < 0
        || completedGoals < 0
        || pausedGoals < 0
        || archivedGoals < 0) {
      throw new IllegalArgumentException("Counts must not be negative");
    }
  }
}
