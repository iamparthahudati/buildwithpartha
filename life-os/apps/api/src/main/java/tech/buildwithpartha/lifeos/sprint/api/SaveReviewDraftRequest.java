package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

public record SaveReviewDraftRequest(
    @NotNull ReviewType reviewType,
    @NotBlank String periodKey,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    @NotBlank String timeZone,
    List<@Valid ReviewAnswerRequest> answers,
    List<@Valid ReviewItemDecisionRequest> itemDecisions,
    ReviewSnapshotMetricsRequest snapshot) {}
