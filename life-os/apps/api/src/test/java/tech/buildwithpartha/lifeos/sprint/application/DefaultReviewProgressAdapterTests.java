package tech.buildwithpartha.lifeos.sprint.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tech.buildwithpartha.lifeos.common.progress.ReviewProgressPort;
import tech.buildwithpartha.lifeos.sprint.domain.Review;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewRepository;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewSnapshotMetrics;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

@ExtendWith(MockitoExtension.class)
class DefaultReviewProgressAdapterTests {

  @Mock private ReviewRepository reviewRepository;

  private DefaultReviewProgressAdapter adapter;
  private UUID userId;

  @BeforeEach
  void setUp() {
    adapter = new DefaultReviewProgressAdapter(reviewRepository);
    userId = UUID.randomUUID();
  }

  @Test
  void calculatesReviewStreakAndFinalizedCount() {
    Instant now = Instant.now();
    LocalDate today = LocalDate.of(2026, 8, 26);
    LocalDate yesterday = LocalDate.of(2026, 8, 25);
    LocalDate startDate = LocalDate.of(2026, 8, 20);

    ReviewSnapshotMetrics snapshot = ReviewSnapshotMetrics.empty();

    Review reviewToday =
        Review.createDraft(
                UUID.randomUUID(),
                userId,
                ReviewType.DAILY_MORNING,
                today.toString(),
                today,
                today,
                "UTC",
                List.of(),
                List.of(),
                now)
            .finalizeReview(snapshot, List.of(), List.of(), now);

    Review reviewYesterday =
        Review.createDraft(
                UUID.randomUUID(),
                userId,
                ReviewType.DAILY_EVENING,
                yesterday.toString(),
                yesterday,
                yesterday,
                "UTC",
                List.of(),
                List.of(),
                now)
            .finalizeReview(snapshot, List.of(), List.of(), now);

    when(reviewRepository.findByUserId(userId)).thenReturn(List.of(reviewToday, reviewYesterday));

    ReviewProgressPort.ReviewProgressData data =
        adapter.getReviewProgress(userId, startDate, today, today);

    assertEquals(2, data.dailyStreakDays());
    assertEquals(2, data.finalizedReviewsCount());
  }

  @Test
  void handlesEmptyReviews() {
    LocalDate today = LocalDate.of(2026, 8, 26);
    LocalDate startDate = LocalDate.of(2026, 8, 20);

    when(reviewRepository.findByUserId(userId)).thenReturn(List.of());

    ReviewProgressPort.ReviewProgressData data =
        adapter.getReviewProgress(userId, startDate, today, today);

    assertEquals(0, data.dailyStreakDays());
    assertEquals(0, data.finalizedReviewsCount());
  }
}
