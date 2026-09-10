package tech.buildwithpartha.lifeos.sprint.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.sprint.ReviewTodayPort.TodayReviewSummary;
import tech.buildwithpartha.lifeos.sprint.domain.Review;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewRepository;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewSnapshotMetrics;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewStatus;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

class DefaultReviewTodayAdapterTests {

  private ReviewRepository reviewRepository;
  private DefaultReviewTodayAdapter adapter;

  @BeforeEach
  void setUp() {
    reviewRepository = mock(ReviewRepository.class);
    adapter = new DefaultReviewTodayAdapter(reviewRepository);
  }

  @Test
  void retrievesTodayReviewSummary() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    String periodKey = "2026-09-10";

    Review morningReview =
        new Review(
            UUID.randomUUID(),
            userId,
            ReviewType.DAILY_MORNING,
            periodKey,
            today,
            today,
            "UTC",
            ReviewStatus.FINALIZED,
            Optional.empty(),
            Optional.of(Instant.now()),
            Optional.of(ReviewSnapshotMetrics.empty()),
            List.of(),
            List.of(),
            Instant.now(),
            Instant.now(),
            1L);

    given(
            reviewRepository.findByUserIdAndTypeAndPeriodKey(
                userId, ReviewType.DAILY_MORNING, periodKey))
        .willReturn(Optional.of(morningReview));
    given(
            reviewRepository.findByUserIdAndTypeAndPeriodKey(
                userId, ReviewType.DAILY_EVENING, periodKey))
        .willReturn(Optional.empty());

    TodayReviewSummary result = adapter.getTodayReview(userId, today);

    assertThat(result.morningReviewCompleted()).isTrue();
    assertThat(result.morningReviewState()).isEqualTo("FINALIZED");
    assertThat(result.eveningReviewCompleted()).isFalse();
    assertThat(result.eveningReviewState()).isEqualTo("NOT_STARTED");
  }

  @Test
  void retrievesEveningFinalizedReview() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    String periodKey = "2026-09-10";

    Review eveningReview =
        new Review(
            UUID.randomUUID(),
            userId,
            ReviewType.DAILY_EVENING,
            periodKey,
            today,
            today,
            "UTC",
            ReviewStatus.FINALIZED,
            Optional.empty(),
            Optional.of(Instant.now()),
            Optional.of(ReviewSnapshotMetrics.empty()),
            List.of(),
            List.of(),
            Instant.now(),
            Instant.now(),
            1L);

    given(
            reviewRepository.findByUserIdAndTypeAndPeriodKey(
                userId, ReviewType.DAILY_MORNING, periodKey))
        .willReturn(Optional.empty());
    given(
            reviewRepository.findByUserIdAndTypeAndPeriodKey(
                userId, ReviewType.DAILY_EVENING, periodKey))
        .willReturn(Optional.of(eveningReview));

    TodayReviewSummary result = adapter.getTodayReview(userId, today);

    assertThat(result.morningReviewCompleted()).isFalse();
    assertThat(result.morningReviewState()).isEqualTo("NOT_STARTED");
    assertThat(result.eveningReviewCompleted()).isTrue();
    assertThat(result.eveningReviewState()).isEqualTo("FINALIZED");
  }
}
