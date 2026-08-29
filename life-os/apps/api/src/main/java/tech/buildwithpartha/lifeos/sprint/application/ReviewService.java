package tech.buildwithpartha.lifeos.sprint.application;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.error.ReviewStateConflictException;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand.ReviewAnswerInput;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand.ReviewItemDecisionInput;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand.ReviewSnapshotMetricsInput;
import tech.buildwithpartha.lifeos.sprint.domain.Review;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewAnswer;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewItemDecision;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewRepository;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewSnapshotMetrics;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewStatus;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

@Service
@Transactional
public class ReviewService {
  private final ReviewRepository reviewRepository;

  public ReviewService(ReviewRepository reviewRepository) {
    this.reviewRepository = reviewRepository;
  }

  @Transactional(readOnly = true)
  public List<Review> list(UUID userId, Optional<ReviewType> reviewType) {
    Objects.requireNonNull(userId);
    Objects.requireNonNull(reviewType);
    return reviewType
        .map(type -> reviewRepository.findByUserIdAndType(userId, type))
        .orElseGet(() -> reviewRepository.findByUserId(userId));
  }

  @Transactional(readOnly = true)
  public Review get(UUID userId, UUID id) {
    Objects.requireNonNull(userId);
    Objects.requireNonNull(id);
    Review review =
        reviewRepository
            .findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
    if (!review.userId().equals(userId)) {
      throw new ResourceNotFoundException("Review not found");
    }
    return review;
  }

  @Transactional(readOnly = true)
  public ReviewPromptsAndMetricsView getPromptsAndMetrics(
      UUID userId,
      ReviewType reviewType,
      String periodKey,
      LocalDate startDate,
      LocalDate endDate,
      String timeZone) {
    Objects.requireNonNull(userId);
    Objects.requireNonNull(reviewType);
    Objects.requireNonNull(periodKey);
    Objects.requireNonNull(startDate);
    Objects.requireNonNull(endDate);
    Objects.requireNonNull(timeZone);

    List<ReviewPrompt> prompts = generatePrompts(reviewType);
    Optional<Review> existing =
        reviewRepository.findByUserIdAndTypeAndPeriodKey(userId, reviewType, periodKey);

    ReviewSnapshotMetrics metrics =
        existing.flatMap(Review::snapshot).orElseGet(ReviewSnapshotMetrics::empty);

    return new ReviewPromptsAndMetricsView(
        reviewType, periodKey, startDate, endDate, timeZone, prompts, metrics);
  }

  public Review saveDraft(UUID userId, SaveReviewDraftCommand command) {
    Objects.requireNonNull(userId);
    Objects.requireNonNull(command);

    Instant now = Instant.now();
    Optional<Review> existingOpt =
        reviewRepository.findByUserIdAndTypeAndPeriodKey(
            userId, command.reviewType(), command.periodKey());

    List<ReviewAnswer> answers = mapAnswers(command.answers());
    List<ReviewItemDecision> decisions = mapDecisions(command.itemDecisions());
    Optional<ReviewSnapshotMetrics> snapshot = command.snapshot().map(this::mapSnapshot);

    if (existingOpt.isPresent()) {
      Review existing = existingOpt.get();
      if (existing.status() == ReviewStatus.FINALIZED
          || existing.status() == ReviewStatus.SKIPPED) {
        throw new ReviewStateConflictException(
            "Cannot edit a review that is already " + existing.status());
      }
      Review updated = existing.updateDraft(answers, decisions, snapshot, now);
      return reviewRepository.save(updated);
    } else {
      Review draft =
          Review.createDraft(
              UUID.randomUUID(),
              userId,
              command.reviewType(),
              command.periodKey(),
              command.startDate(),
              command.endDate(),
              command.timeZone(),
              answers,
              decisions,
              now);
      if (snapshot.isPresent()) {
        draft = draft.updateDraft(answers, decisions, snapshot, now);
      }
      return reviewRepository.save(draft);
    }
  }

  public Review finalizeReview(UUID userId, UUID id, FinalizeReviewCommand command) {
    Objects.requireNonNull(userId);
    Objects.requireNonNull(id);
    Objects.requireNonNull(command);

    Review review = get(userId, id);
    if (review.status() == ReviewStatus.FINALIZED) {
      return review;
    }
    if (review.status() == ReviewStatus.SKIPPED) {
      throw new ReviewStateConflictException("Cannot finalize a review that was skipped");
    }

    Instant now = Instant.now();
    List<ReviewAnswer> finalAnswers =
        command.answers().map(this::mapAnswers).orElseGet(review::answers);
    List<ReviewItemDecision> finalDecisions =
        command.itemDecisions().map(this::mapDecisions).orElseGet(review::itemDecisions);
    ReviewSnapshotMetrics finalSnapshot =
        command
            .snapshot()
            .map(this::mapSnapshot)
            .orElseGet(() -> review.snapshot().orElseGet(ReviewSnapshotMetrics::empty));

    Review finalized = review.finalizeReview(finalSnapshot, finalAnswers, finalDecisions, now);
    return reviewRepository.save(finalized);
  }

  public Review skipReview(UUID userId, SkipReviewCommand command) {
    Objects.requireNonNull(userId);
    Objects.requireNonNull(command);

    Instant now = Instant.now();
    Optional<Review> existingOpt =
        reviewRepository.findByUserIdAndTypeAndPeriodKey(
            userId, command.reviewType(), command.periodKey());

    if (existingOpt.isPresent()) {
      Review existing = existingOpt.get();
      if (existing.status() == ReviewStatus.FINALIZED) {
        throw new ReviewStateConflictException("Cannot skip a review that is already finalized");
      }
      Review skipped = existing.skipReview(command.reason(), now);
      return reviewRepository.save(skipped);
    } else {
      Review draft =
          Review.createDraft(
              UUID.randomUUID(),
              userId,
              command.reviewType(),
              command.periodKey(),
              command.startDate(),
              command.endDate(),
              command.timeZone(),
              List.of(),
              List.of(),
              now);
      Review skipped = draft.skipReview(command.reason(), now);
      return reviewRepository.save(skipped);
    }
  }

  public Review reopenReview(UUID userId, UUID id) {
    Objects.requireNonNull(userId);
    Objects.requireNonNull(id);

    get(userId, id);
    throw new ReviewStateConflictException("Finalized reviews cannot be reopened by policy");
  }

  private List<ReviewAnswer> mapAnswers(List<ReviewAnswerInput> inputs) {
    if (inputs == null) {
      return List.of();
    }
    List<ReviewAnswer> list = new ArrayList<>();
    for (ReviewAnswerInput input : inputs) {
      list.add(new ReviewAnswer(UUID.randomUUID(), input.promptKey(), input.answerValue()));
    }
    return List.copyOf(list);
  }

  private List<ReviewItemDecision> mapDecisions(List<ReviewItemDecisionInput> inputs) {
    if (inputs == null) {
      return List.of();
    }
    List<ReviewItemDecision> list = new ArrayList<>();
    for (ReviewItemDecisionInput input : inputs) {
      list.add(
          new ReviewItemDecision(
              UUID.randomUUID(),
              input.itemType(),
              input.itemId(),
              input.action(),
              input.targetDate(),
              input.notes()));
    }
    return List.copyOf(list);
  }

  private ReviewSnapshotMetrics mapSnapshot(ReviewSnapshotMetricsInput input) {
    if (input == null) {
      return ReviewSnapshotMetrics.empty();
    }
    return new ReviewSnapshotMetrics(
        input.tasksCompletedCount(),
        input.tasksPlannedCount(),
        input.tasksCarriedOverCount(),
        input.tasksCancelledCount(),
        input.tasksOverdueCount(),
        input.plannedFocusMinutes(),
        input.actualFocusMinutes(),
        input.sprintCommittedCount(),
        input.sprintCompletedCount(),
        input.activeProjectCount(),
        input.completedProjectCount(),
        input.stalledProjectCount(),
        input.dailyReviewCompletionCount(),
        input.hasMissingData(),
        input.missingDataNotes());
  }

  private List<ReviewPrompt> generatePrompts(ReviewType reviewType) {
    return switch (reviewType) {
      case DAILY_MORNING ->
          List.of(
              new ReviewPrompt(
                  "orient", "Orient", "What already has a place in your day?", 1, false),
              new ReviewPrompt(
                  "mit",
                  "Choose focus",
                  "If one thing moves forward today, what should it be?",
                  2,
                  false),
              new ReviewPrompt(
                  "plan_check",
                  "Check the plan",
                  "Is this plan possible with the time you have?",
                  3,
                  false),
              new ReviewPrompt(
                  "intention", "Commit", "What is your main intention for today?", 4, true));
      case DAILY_EVENING ->
          List.of(
              new ReviewPrompt("progress", "Notice", "What moved forward today?", 1, false),
              new ReviewPrompt(
                  "carry_over",
                  "Resolve unfinished work",
                  "What deserves another place, and what can be released?",
                  2,
                  false),
              new ReviewPrompt("wins", "Reflect", "What was a win or progress today?", 3, true),
              new ReviewPrompt(
                  "lessons", "Reflect", "What lesson or note do you have for tomorrow?", 3, true));
      case WEEKLY ->
          List.of(
              new ReviewPrompt(
                  "meaningful_progress",
                  "Review the week",
                  "What created meaningful progress?",
                  1,
                  false),
              new ReviewPrompt(
                  "friction", "Review the week", "What repeatedly got in the way?", 2, false),
              new ReviewPrompt(
                  "next_changes", "Plan next week", "What should change next week?", 3, false));
      case MONTHLY ->
          List.of(
              new ReviewPrompt(
                  "highlights", "Reflect", "What are you glad moved forward?", 1, true),
              new ReviewPrompt(
                  "challenges", "Reflect", "What deserves attention or support?", 2, true),
              new ReviewPrompt("stop", "Reflect", "What no longer earns time?", 3, true),
              new ReviewPrompt(
                  "start",
                  "Reflect",
                  "What would make next month easier or more meaningful?",
                  4,
                  true),
              new ReviewPrompt(
                  "continue", "Reflect", "What is working well enough to protect?", 5, true));
    };
  }
}
