package tech.buildwithpartha.lifeos.sprint.api;

import java.util.Optional;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewSnapshotMetrics;

public record ReviewSnapshotMetricsResponse(
    Optional<Integer> tasksCompletedCount,
    Optional<Integer> tasksPlannedCount,
    Optional<Integer> tasksCarriedOverCount,
    Optional<Integer> tasksCancelledCount,
    Optional<Integer> tasksOverdueCount,
    Optional<Integer> plannedFocusMinutes,
    Optional<Integer> actualFocusMinutes,
    Optional<Integer> sprintCommittedCount,
    Optional<Integer> sprintCompletedCount,
    Optional<Integer> activeProjectCount,
    Optional<Integer> completedProjectCount,
    Optional<Integer> stalledProjectCount,
    Optional<Integer> dailyReviewCompletionCount,
    boolean hasMissingData,
    Optional<String> missingDataNotes) {

  public static ReviewSnapshotMetricsResponse fromDomain(ReviewSnapshotMetrics metrics) {
    return new ReviewSnapshotMetricsResponse(
        metrics.tasksCompletedCount(),
        metrics.tasksPlannedCount(),
        metrics.tasksCarriedOverCount(),
        metrics.tasksCancelledCount(),
        metrics.tasksOverdueCount(),
        metrics.plannedFocusMinutes(),
        metrics.actualFocusMinutes(),
        metrics.sprintCommittedCount(),
        metrics.sprintCompletedCount(),
        metrics.activeProjectCount(),
        metrics.completedProjectCount(),
        metrics.stalledProjectCount(),
        metrics.dailyReviewCompletionCount(),
        metrics.hasMissingData(),
        metrics.missingDataNotes());
  }
}
