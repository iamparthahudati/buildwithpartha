package tech.buildwithpartha.lifeos.sprint.application;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

public record SaveReviewDraftCommand(
    ReviewType reviewType,
    String periodKey,
    LocalDate startDate,
    LocalDate endDate,
    String timeZone,
    List<ReviewAnswerInput> answers,
    List<ReviewItemDecisionInput> itemDecisions,
    Optional<ReviewSnapshotMetricsInput> snapshot) {
  public SaveReviewDraftCommand {
    Objects.requireNonNull(reviewType);
    Objects.requireNonNull(periodKey);
    Objects.requireNonNull(startDate);
    Objects.requireNonNull(endDate);
    Objects.requireNonNull(timeZone);
    answers = answers != null ? List.copyOf(answers) : List.of();
    itemDecisions = itemDecisions != null ? List.copyOf(itemDecisions) : List.of();
    Objects.requireNonNull(snapshot);
  }

  public record ReviewAnswerInput(String promptKey, String answerValue) {
    public ReviewAnswerInput {
      Objects.requireNonNull(promptKey);
      Objects.requireNonNull(answerValue);
    }
  }

  public record ReviewItemDecisionInput(
      String itemType,
      UUID itemId,
      String action,
      Optional<LocalDate> targetDate,
      Optional<String> notes) {
    public ReviewItemDecisionInput {
      Objects.requireNonNull(itemType);
      Objects.requireNonNull(itemId);
      Objects.requireNonNull(action);
      Objects.requireNonNull(targetDate);
      Objects.requireNonNull(notes);
    }
  }

  public record ReviewSnapshotMetricsInput(
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
      Optional<String> missingDataNotes) {}
}
