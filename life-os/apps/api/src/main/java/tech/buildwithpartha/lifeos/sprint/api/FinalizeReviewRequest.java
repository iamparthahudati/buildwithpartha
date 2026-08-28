package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.Valid;
import java.util.List;

public record FinalizeReviewRequest(
    List<@Valid ReviewAnswerRequest> answers,
    List<@Valid ReviewItemDecisionRequest> itemDecisions,
    ReviewSnapshotMetricsRequest snapshot) {}
