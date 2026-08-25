package tech.buildwithpartha.lifeos.sprint.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ReviewDomainTest {

  private final UUID userId = UUID.randomUUID();
  private final Instant now = Instant.parse("2026-08-25T10:00:00Z");

  @Test
  @DisplayName("createDraft creates a review in DRAFT status with valid period identity")
  void createDraftSuccess() {
    UUID reviewId = UUID.randomUUID();
    ReviewAnswer answer = new ReviewAnswer(UUID.randomUUID(), "mit", "Task 1");
    ReviewItemDecision decision =
        new ReviewItemDecision(
            UUID.randomUUID(),
            "TASK",
            UUID.randomUUID(),
            "KEEP_FOR_TOMORROW",
            Optional.of(LocalDate.of(2026, 8, 26)),
            Optional.of("Carry over"));

    Review review =
        Review.createDraft(
            reviewId,
            userId,
            ReviewType.DAILY_MORNING,
            "2026-08-25",
            LocalDate.of(2026, 8, 25),
            LocalDate.of(2026, 8, 25),
            "UTC",
            List.of(answer),
            List.of(decision),
            now);

    assertThat(review.id()).isEqualTo(reviewId);
    assertThat(review.userId()).isEqualTo(userId);
    assertThat(review.reviewType()).isEqualTo(ReviewType.DAILY_MORNING);
    assertThat(review.periodKey()).isEqualTo("2026-08-25");
    assertThat(review.status()).isEqualTo(ReviewStatus.DRAFT);
    assertThat(review.answers()).hasSize(1);
    assertThat(review.itemDecisions()).hasSize(1);
    assertThat(review.snapshot()).isEmpty();
  }

  @Test
  @DisplayName("Domain validation throws on invalid dates or period keys")
  void domainValidationFails() {
    assertThatThrownBy(
            () ->
                Review.createDraft(
                    UUID.randomUUID(),
                    userId,
                    ReviewType.DAILY_MORNING,
                    "",
                    LocalDate.of(2026, 8, 25),
                    LocalDate.of(2026, 8, 25),
                    "UTC",
                    List.of(),
                    List.of(),
                    now))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Period key cannot be blank");

    assertThatThrownBy(
            () ->
                Review.createDraft(
                    UUID.randomUUID(),
                    userId,
                    ReviewType.WEEKLY,
                    "2026-W35",
                    LocalDate.of(2026, 8, 25),
                    LocalDate.of(2026, 8, 24),
                    "UTC",
                    List.of(),
                    List.of(),
                    now))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("End date cannot precede start date");
  }

  @Test
  @DisplayName("finalizeReview transitions status to FINALIZED and freezes metric snapshot")
  void finalizeReviewSuccess() {
    Review review =
        Review.createDraft(
            UUID.randomUUID(),
            userId,
            ReviewType.WEEKLY,
            "2026-W35",
            LocalDate.of(2026, 8, 24),
            LocalDate.of(2026, 8, 30),
            "UTC",
            List.of(),
            List.of(),
            now);

    ReviewSnapshotMetrics metrics =
        new ReviewSnapshotMetrics(
            Optional.of(5),
            Optional.of(8),
            Optional.of(1),
            Optional.of(0),
            Optional.of(0),
            Optional.of(240),
            Optional.of(200),
            Optional.of(10),
            Optional.of(8),
            Optional.of(3),
            Optional.of(1),
            Optional.of(0),
            Optional.of(7),
            false,
            Optional.empty());

    Review finalized = review.finalizeReview(metrics, null, null, now.plusSeconds(300));

    assertThat(finalized.status()).isEqualTo(ReviewStatus.FINALIZED);
    assertThat(finalized.finalizedAt()).contains(now.plusSeconds(300));
    assertThat(finalized.snapshot()).contains(metrics);
  }

  @Test
  @DisplayName("finalizeReview is idempotent when already FINALIZED")
  void repeatedFinalizeIsIdempotent() {
    Review review =
        Review.createDraft(
            UUID.randomUUID(),
            userId,
            ReviewType.DAILY_EVENING,
            "2026-08-25",
            LocalDate.of(2026, 8, 25),
            LocalDate.of(2026, 8, 25),
            "UTC",
            List.of(),
            List.of(),
            now);

    ReviewSnapshotMetrics metrics =
        new ReviewSnapshotMetrics(
            Optional.of(3),
            Optional.of(3),
            Optional.of(0),
            Optional.of(0),
            Optional.of(0),
            Optional.of(120),
            Optional.of(120),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            false,
            Optional.empty());

    Review finalized1 = review.finalizeReview(metrics, null, null, now);
    Review finalized2 = finalized1.finalizeReview(metrics, null, null, now.plusSeconds(600));

    assertThat(finalized2).isEqualTo(finalized1);
  }

  @Test
  @DisplayName("skipReview transitions status to SKIPPED with reason")
  void skipReviewSuccess() {
    Review review =
        Review.createDraft(
            UUID.randomUUID(),
            userId,
            ReviewType.MONTHLY,
            "2026-08",
            LocalDate.of(2026, 8, 1),
            LocalDate.of(2026, 8, 31),
            "UTC",
            List.of(),
            List.of(),
            now);

    Review skipped = review.skipReview("No time", now.plusSeconds(60));

    assertThat(skipped.status()).isEqualTo(ReviewStatus.SKIPPED);
    assertThat(skipped.skipReason()).contains("No time");
  }

  @Test
  @DisplayName("editing a finalized or skipped review throws IllegalStateException")
  void editFinalizedOrSkippedFails() {
    Review review =
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
            now);

    ReviewSnapshotMetrics metrics = ReviewSnapshotMetrics.empty();
    Review finalized = review.finalizeReview(metrics, null, null, now);

    assertThatThrownBy(() -> finalized.updateDraft(List.of(), List.of(), Optional.empty(), now))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Cannot edit a review that is already FINALIZED");
  }
}
