package tech.buildwithpartha.lifeos.sprint.application;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand.ReviewAnswerInput;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand.ReviewItemDecisionInput;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand.ReviewSnapshotMetricsInput;

public record FinalizeReviewCommand(
    Optional<List<ReviewAnswerInput>> answers,
    Optional<List<ReviewItemDecisionInput>> itemDecisions,
    Optional<ReviewSnapshotMetricsInput> snapshot) {
  public FinalizeReviewCommand {
    Objects.requireNonNull(answers);
    Objects.requireNonNull(itemDecisions);
    Objects.requireNonNull(snapshot);
  }
}
