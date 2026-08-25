package tech.buildwithpartha.lifeos.goal.api;

import java.util.Objects;
import tech.buildwithpartha.lifeos.goal.domain.GoalSummaryCounts;

/** Response DTO holding summary metrics for a user's goals. */
public record GoalSummaryCountsResponse(
    long totalGoals, long activeGoals, long completedGoals, long pausedGoals, long archivedGoals) {

  public static GoalSummaryCountsResponse fromDomain(GoalSummaryCounts domain) {
    Objects.requireNonNull(domain, "domain must not be null");
    return new GoalSummaryCountsResponse(
        domain.totalGoals(),
        domain.activeGoals(),
        domain.completedGoals(),
        domain.pausedGoals(),
        domain.archivedGoals());
  }
}
