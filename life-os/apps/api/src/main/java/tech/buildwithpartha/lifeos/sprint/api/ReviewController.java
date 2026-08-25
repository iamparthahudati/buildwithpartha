package tech.buildwithpartha.lifeos.sprint.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.sprint.application.FinalizeReviewCommand;
import tech.buildwithpartha.lifeos.sprint.application.ReviewService;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand.ReviewAnswerInput;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand.ReviewItemDecisionInput;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand.ReviewSnapshotMetricsInput;
import tech.buildwithpartha.lifeos.sprint.application.SkipReviewCommand;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

@RestController
@RequestMapping("/reviews")
@SecurityRequirement(name = "sessionCookie")
public class ReviewController {
  private final ReviewService service;

  public ReviewController(ReviewService service) {
    this.service = service;
  }

  @Operation(summary = "List review history")
  @GetMapping
  public List<ReviewResponse> list(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(name = "type", required = false) String type) {
    Optional<ReviewType> reviewType = parseReviewType(type);
    return service.list(userId, reviewType).stream().map(ReviewResponse::fromDomain).toList();
  }

  @Operation(summary = "Get review prompts and metrics for a period")
  @GetMapping("/prompts")
  public ReviewPromptsAndMetricsResponse getPromptsAndMetrics(
      @AuthenticationPrincipal UUID userId,
      @RequestParam ReviewType type,
      @RequestParam String periodKey,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
      @RequestParam(required = false, defaultValue = "UTC") String timeZone) {
    var view = service.getPromptsAndMetrics(userId, type, periodKey, startDate, endDate, timeZone);
    return new ReviewPromptsAndMetricsResponse(
        view.reviewType(),
        view.periodKey(),
        view.startDate(),
        view.endDate(),
        view.timeZone(),
        view.prompts().stream()
            .map(
                p ->
                    new ReviewPromptResponse(
                        p.promptKey(), p.title(), p.promptText(), p.stepNumber(), p.optional()))
            .toList(),
        ReviewSnapshotMetricsResponse.fromDomain(view.metrics()));
  }

  @Operation(summary = "Get review by ID")
  @GetMapping("/{id}")
  public ReviewResponse get(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
    return ReviewResponse.fromDomain(service.get(userId, id));
  }

  @Operation(summary = "Save or update a review draft")
  @PostMapping("/draft")
  public ResponseEntity<ReviewResponse> saveDraft(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody SaveReviewDraftRequest request) {
    var review =
        service.saveDraft(
            userId,
            new SaveReviewDraftCommand(
                request.reviewType(),
                request.periodKey(),
                request.startDate(),
                request.endDate(),
                request.timeZone(),
                request.answers() != null
                    ? request.answers().stream().map(ReviewController::toAnswerInput).toList()
                    : List.of(),
                request.itemDecisions() != null
                    ? request.itemDecisions().stream()
                        .map(ReviewController::toDecisionInput)
                        .toList()
                    : List.of(),
                Optional.ofNullable(request.snapshot()).map(ReviewController::toSnapshotInput)));
    return ResponseEntity.created(URI.create("/life-os/api/v1/reviews/" + review.id()))
        .body(ReviewResponse.fromDomain(review));
  }

  @Operation(summary = "Finalize a review")
  @PostMapping("/{id}/finalize")
  public ReviewResponse finalizeReview(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID id,
      @RequestBody(required = false) FinalizeReviewRequest request) {
    FinalizeReviewRequest req =
        request != null ? request : new FinalizeReviewRequest(null, null, null);
    var command =
        new FinalizeReviewCommand(
            Optional.ofNullable(req.answers())
                .map(list -> list.stream().map(ReviewController::toAnswerInput).toList()),
            Optional.ofNullable(req.itemDecisions())
                .map(list -> list.stream().map(ReviewController::toDecisionInput).toList()),
            Optional.ofNullable(req.snapshot()).map(ReviewController::toSnapshotInput));
    return ReviewResponse.fromDomain(service.finalizeReview(userId, id, command));
  }

  @Operation(summary = "Skip a review")
  @PostMapping("/skip")
  public ResponseEntity<ReviewResponse> skip(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody SkipReviewRequest request) {
    var review =
        service.skipReview(
            userId,
            new SkipReviewCommand(
                request.reviewType(),
                request.periodKey(),
                request.startDate(),
                request.endDate(),
                request.timeZone(),
                request.reason()));
    return ResponseEntity.created(URI.create("/life-os/api/v1/reviews/" + review.id()))
        .body(ReviewResponse.fromDomain(review));
  }

  @Operation(summary = "Reopen a finalized review (rejected by policy)")
  @PostMapping("/{id}/reopen")
  public ReviewResponse reopen(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
    return ReviewResponse.fromDomain(service.reopenReview(userId, id));
  }

  private static Optional<ReviewType> parseReviewType(String type) {
    if (type == null || type.isBlank()) {
      return Optional.empty();
    }
    try {
      return Optional.of(ReviewType.valueOf(type.trim().toUpperCase()));
    } catch (IllegalArgumentException e) {
      return Optional.empty();
    }
  }

  private static ReviewAnswerInput toAnswerInput(ReviewAnswerRequest request) {
    return new ReviewAnswerInput(request.promptKey(), request.answerValue());
  }

  private static ReviewItemDecisionInput toDecisionInput(ReviewItemDecisionRequest request) {
    return new ReviewItemDecisionInput(
        request.itemType(),
        request.itemId(),
        request.action(),
        Optional.ofNullable(request.targetDate()),
        Optional.ofNullable(request.notes()));
  }

  private static ReviewSnapshotMetricsInput toSnapshotInput(ReviewSnapshotMetricsRequest request) {
    return new ReviewSnapshotMetricsInput(
        Optional.ofNullable(request.tasksCompletedCount()),
        Optional.ofNullable(request.tasksPlannedCount()),
        Optional.ofNullable(request.tasksCarriedOverCount()),
        Optional.ofNullable(request.tasksCancelledCount()),
        Optional.ofNullable(request.tasksOverdueCount()),
        Optional.ofNullable(request.plannedFocusMinutes()),
        Optional.ofNullable(request.actualFocusMinutes()),
        Optional.ofNullable(request.sprintCommittedCount()),
        Optional.ofNullable(request.sprintCompletedCount()),
        Optional.ofNullable(request.activeProjectCount()),
        Optional.ofNullable(request.completedProjectCount()),
        Optional.ofNullable(request.stalledProjectCount()),
        Optional.ofNullable(request.dailyReviewCompletionCount()),
        request.hasMissingData() != null ? request.hasMissingData() : false,
        Optional.ofNullable(request.missingDataNotes()));
  }
}
