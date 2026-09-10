package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.sprint.ReviewTodayPort;
import tech.buildwithpartha.lifeos.sprint.domain.Review;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewRepository;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewStatus;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

/**
 * Review domain adapter implementing {@link ReviewTodayPort} for Today dashboard queries
 * (LOS-1415).
 */
@Component
public class DefaultReviewTodayAdapter implements ReviewTodayPort {

  private final ReviewRepository reviewRepository;

  public DefaultReviewTodayAdapter(ReviewRepository reviewRepository) {
    this.reviewRepository =
        Objects.requireNonNull(reviewRepository, "reviewRepository must not be null");
  }

  @Override
  @Transactional(readOnly = true)
  public TodayReviewSummary getTodayReview(UUID userId, LocalDate localDate) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(localDate, "localDate must not be null");

    String periodKey = localDate.toString();

    Optional<Review> morning =
        reviewRepository.findByUserIdAndTypeAndPeriodKey(
            userId, ReviewType.DAILY_MORNING, periodKey);
    Optional<Review> evening =
        reviewRepository.findByUserIdAndTypeAndPeriodKey(
            userId, ReviewType.DAILY_EVENING, periodKey);

    boolean morningCompleted = morning.map(r -> r.status() == ReviewStatus.FINALIZED).orElse(false);
    boolean eveningCompleted = evening.map(r -> r.status() == ReviewStatus.FINALIZED).orElse(false);
    String morningState = morning.map(r -> r.status().name()).orElse("NOT_STARTED");
    String eveningState = evening.map(r -> r.status().name()).orElse("NOT_STARTED");

    return new TodayReviewSummary(morningCompleted, eveningCompleted, morningState, eveningState);
  }
}
