package tech.buildwithpartha.lifeos.sprint.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.error.ReviewStateConflictException;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand.ReviewAnswerInput;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand.ReviewItemDecisionInput;
import tech.buildwithpartha.lifeos.sprint.application.SaveReviewDraftCommand.ReviewSnapshotMetricsInput;
import tech.buildwithpartha.lifeos.sprint.domain.Review;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewRepository;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewSnapshotMetrics;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewStatus;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

class ReviewServiceTest {
  private ReviewRepository reviewRepository;
  private ReviewService reviewService;
  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    reviewRepository = mock(ReviewRepository.class);
    reviewService = new ReviewService(reviewRepository);
  }

  @Test
  void getPromptsAndMetricsReturnsPromptsForAllReviewTypes() {
    for (ReviewType type : ReviewType.values()) {
      ReviewPromptsAndMetricsView view =
          reviewService.getPromptsAndMetrics(
              userId,
              type,
              "2026-08-25",
              LocalDate.of(2026, 8, 25),
              LocalDate.of(2026, 8, 25),
              "UTC");

      assertThat(view.reviewType()).isEqualTo(type);
      assertThat(view.prompts()).isNotEmpty();
    }
  }

  @Test
  void listReturnsReviewsWithTypeFilterAndWithoutFilter() {
    when(reviewRepository.findByUserIdAndType(userId, ReviewType.DAILY_MORNING))
        .thenReturn(List.of());
    when(reviewRepository.findByUserId(userId)).thenReturn(List.of());

    assertThat(reviewService.list(userId, Optional.of(ReviewType.DAILY_MORNING))).isEmpty();
    assertThat(reviewService.list(userId, Optional.empty())).isEmpty();
  }

  @Test
  void saveDraftCreatesNewDraftWhenNoneExists() {
    when(reviewRepository.findByUserIdAndTypeAndPeriodKey(any(), any(), any()))
        .thenReturn(Optional.empty());
    when(reviewRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    ReviewSnapshotMetricsInput snapshotInput =
        new ReviewSnapshotMetricsInput(
            Optional.of(5),
            Optional.of(5),
            Optional.of(0),
            Optional.of(0),
            Optional.of(0),
            Optional.of(60),
            Optional.of(60),
            Optional.of(3),
            Optional.of(3),
            Optional.of(2),
            Optional.of(1),
            Optional.of(0),
            Optional.of(1),
            false,
            Optional.empty());

    SaveReviewDraftCommand command =
        new SaveReviewDraftCommand(
            ReviewType.DAILY_MORNING,
            "2026-08-25",
            LocalDate.of(2026, 8, 25),
            LocalDate.of(2026, 8, 25),
            "UTC",
            List.of(new ReviewAnswerInput("orient", "Done orienting")),
            List.of(
                new ReviewItemDecisionInput(
                    "TASK", UUID.randomUUID(), "COMPLETE", Optional.empty(), Optional.empty())),
            Optional.of(snapshotInput));

    Review saved = reviewService.saveDraft(userId, command);

    assertThat(saved.status()).isEqualTo(ReviewStatus.DRAFT);
    assertThat(saved.answers()).hasSize(1);
    assertThat(saved.answers().get(0).promptKey()).isEqualTo("orient");
    assertThat(saved.itemDecisions()).hasSize(1);
    assertThat(saved.snapshot()).isPresent();
    verify(reviewRepository).save(any());
  }

  @Test
  void saveDraftUpdatesExistingDraft() {
    Review existingDraft =
        Review.createDraft(
            UUID.randomUUID(),
            userId,
            ReviewType.DAILY_MORNING,
            "2026-08-25",
            LocalDate.of(2026, 8, 25),
            LocalDate.of(2026, 8, 25),
            "UTC",
            List.of(),
            List.of(),
            Instant.now());

    when(reviewRepository.findByUserIdAndTypeAndPeriodKey(any(), any(), any()))
        .thenReturn(Optional.of(existingDraft));
    when(reviewRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    SaveReviewDraftCommand command =
        new SaveReviewDraftCommand(
            ReviewType.DAILY_MORNING,
            "2026-08-25",
            LocalDate.of(2026, 8, 25),
            LocalDate.of(2026, 8, 25),
            "UTC",
            List.of(new ReviewAnswerInput("orient", "Updated orient")),
            List.of(),
            Optional.empty());

    Review updated = reviewService.saveDraft(userId, command);
    assertThat(updated.answers()).hasSize(1);
    assertThat(updated.answers().get(0).answerValue()).isEqualTo("Updated orient");
  }

  @Test
  void saveDraftThrowsConflictWhenReviewIsFinalizedOrSkipped() {
    Review finalized =
        Review.createDraft(
                UUID.randomUUID(),
                userId,
                ReviewType.DAILY_MORNING,
                "2026-08-25",
                LocalDate.of(2026, 8, 25),
                LocalDate.of(2026, 8, 25),
                "UTC",
                List.of(),
                List.of(),
                Instant.now())
            .finalizeReview(ReviewSnapshotMetrics.empty(), List.of(), List.of(), Instant.now());

    when(reviewRepository.findByUserIdAndTypeAndPeriodKey(any(), any(), any()))
        .thenReturn(Optional.of(finalized));

    SaveReviewDraftCommand command =
        new SaveReviewDraftCommand(
            ReviewType.DAILY_MORNING,
            "2026-08-25",
            LocalDate.of(2026, 8, 25),
            LocalDate.of(2026, 8, 25),
            "UTC",
            List.of(),
            List.of(),
            Optional.empty());

    assertThatThrownBy(() -> reviewService.saveDraft(userId, command))
        .isInstanceOf(ReviewStateConflictException.class)
        .hasMessageContaining("Cannot edit a review that is already FINALIZED");
  }

  @Test
  void finalizeReviewFinalizesDraftSuccessfully() {
    Review draft =
        Review.createDraft(
            UUID.randomUUID(),
            userId,
            ReviewType.DAILY_MORNING,
            "2026-08-25",
            LocalDate.of(2026, 8, 25),
            LocalDate.of(2026, 8, 25),
            "UTC",
            List.of(),
            List.of(),
            Instant.now());

    when(reviewRepository.findById(draft.id())).thenReturn(Optional.of(draft));
    when(reviewRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    FinalizeReviewCommand command =
        new FinalizeReviewCommand(
            Optional.of(List.of(new ReviewAnswerInput("orient", "Final orient"))),
            Optional.of(List.of()),
            Optional.of(
                new ReviewSnapshotMetricsInput(
                    Optional.of(1),
                    Optional.of(1),
                    Optional.of(0),
                    Optional.of(0),
                    Optional.of(0),
                    Optional.of(30),
                    Optional.of(30),
                    Optional.empty(),
                    Optional.empty(),
                    Optional.empty(),
                    Optional.empty(),
                    Optional.empty(),
                    Optional.empty(),
                    false,
                    Optional.empty())));

    Review finalized = reviewService.finalizeReview(userId, draft.id(), command);
    assertThat(finalized.status()).isEqualTo(ReviewStatus.FINALIZED);
    assertThat(finalized.answers()).hasSize(1);
  }

  @Test
  void finalizeReviewThrowsConflictWhenSkipped() {
    Review skipped =
        Review.createDraft(
                UUID.randomUUID(),
                userId,
                ReviewType.DAILY_MORNING,
                "2026-08-25",
                LocalDate.of(2026, 8, 25),
                LocalDate.of(2026, 8, 25),
                "UTC",
                List.of(),
                List.of(),
                Instant.now())
            .skipReview("Reason", Instant.now());

    when(reviewRepository.findById(skipped.id())).thenReturn(Optional.of(skipped));

    assertThatThrownBy(
            () ->
                reviewService.finalizeReview(
                    userId,
                    skipped.id(),
                    new FinalizeReviewCommand(
                        Optional.empty(), Optional.empty(), Optional.empty())))
        .isInstanceOf(ReviewStateConflictException.class)
        .hasMessageContaining("Cannot finalize a review that was skipped");
  }

  @Test
  void skipReviewSkipsDraftOrCreatesSkippedReview() {
    when(reviewRepository.findByUserIdAndTypeAndPeriodKey(any(), any(), any()))
        .thenReturn(Optional.empty());
    when(reviewRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    SkipReviewCommand command =
        new SkipReviewCommand(
            ReviewType.DAILY_MORNING,
            "2026-08-25",
            LocalDate.of(2026, 8, 25),
            LocalDate.of(2026, 8, 25),
            "UTC",
            "Skipping morning review");

    Review skipped = reviewService.skipReview(userId, command);
    assertThat(skipped.status()).isEqualTo(ReviewStatus.SKIPPED);
    assertThat(skipped.skipReason()).contains("Skipping morning review");
  }

  @Test
  void skipReviewThrowsConflictWhenFinalized() {
    Review finalized =
        Review.createDraft(
                UUID.randomUUID(),
                userId,
                ReviewType.DAILY_MORNING,
                "2026-08-25",
                LocalDate.of(2026, 8, 25),
                LocalDate.of(2026, 8, 25),
                "UTC",
                List.of(),
                List.of(),
                Instant.now())
            .finalizeReview(ReviewSnapshotMetrics.empty(), List.of(), List.of(), Instant.now());

    when(reviewRepository.findByUserIdAndTypeAndPeriodKey(any(), any(), any()))
        .thenReturn(Optional.of(finalized));

    SkipReviewCommand command =
        new SkipReviewCommand(
            ReviewType.DAILY_MORNING,
            "2026-08-25",
            LocalDate.of(2026, 8, 25),
            LocalDate.of(2026, 8, 25),
            "UTC",
            "Reason");

    assertThatThrownBy(() -> reviewService.skipReview(userId, command))
        .isInstanceOf(ReviewStateConflictException.class)
        .hasMessageContaining("Cannot skip a review that is already finalized");
  }

  @Test
  void reopenReviewThrowsConflictByPolicy() {
    Review draft =
        Review.createDraft(
            UUID.randomUUID(),
            userId,
            ReviewType.DAILY_MORNING,
            "2026-08-25",
            LocalDate.of(2026, 8, 25),
            LocalDate.of(2026, 8, 25),
            "UTC",
            List.of(),
            List.of(),
            Instant.now());

    when(reviewRepository.findById(draft.id())).thenReturn(Optional.of(draft));

    assertThatThrownBy(() -> reviewService.reopenReview(userId, draft.id()))
        .isInstanceOf(ReviewStateConflictException.class)
        .hasMessageContaining("Finalized reviews cannot be reopened by policy");
  }

  @Test
  void getThrowsResourceNotFoundWhenReviewDoesNotExistOrBelongsToAnotherUser() {
    UUID missingId = UUID.randomUUID();
    when(reviewRepository.findById(missingId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> reviewService.get(userId, missingId))
        .isInstanceOf(ResourceNotFoundException.class);

    Review otherUserReview =
        Review.createDraft(
            missingId,
            UUID.randomUUID(),
            ReviewType.DAILY_MORNING,
            "2026-08-25",
            LocalDate.of(2026, 8, 25),
            LocalDate.of(2026, 8, 25),
            "UTC",
            List.of(),
            List.of(),
            Instant.now());
    when(reviewRepository.findById(missingId)).thenReturn(Optional.of(otherUserReview));

    assertThatThrownBy(() -> reviewService.get(userId, missingId))
        .isInstanceOf(ResourceNotFoundException.class);
  }
}
