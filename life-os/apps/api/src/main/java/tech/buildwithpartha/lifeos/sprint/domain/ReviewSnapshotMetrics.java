package tech.buildwithpartha.lifeos.sprint.domain;

import java.util.Objects;
import java.util.Optional;

public record ReviewSnapshotMetrics(
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
  public ReviewSnapshotMetrics {
    Objects.requireNonNull(tasksCompletedCount);
    Objects.requireNonNull(tasksPlannedCount);
    Objects.requireNonNull(tasksCarriedOverCount);
    Objects.requireNonNull(tasksCancelledCount);
    Objects.requireNonNull(tasksOverdueCount);
    Objects.requireNonNull(plannedFocusMinutes);
    Objects.requireNonNull(actualFocusMinutes);
    Objects.requireNonNull(sprintCommittedCount);
    Objects.requireNonNull(sprintCompletedCount);
    Objects.requireNonNull(activeProjectCount);
    Objects.requireNonNull(completedProjectCount);
    Objects.requireNonNull(stalledProjectCount);
    Objects.requireNonNull(dailyReviewCompletionCount);
    Objects.requireNonNull(missingDataNotes);
  }

  public static ReviewSnapshotMetrics empty() {
    return new ReviewSnapshotMetrics(
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        false,
        Optional.empty());
  }
}
