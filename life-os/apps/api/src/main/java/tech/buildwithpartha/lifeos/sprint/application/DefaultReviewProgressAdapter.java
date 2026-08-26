package tech.buildwithpartha.lifeos.sprint.application;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.progress.ReviewProgressPort;
import tech.buildwithpartha.lifeos.sprint.domain.Review;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewRepository;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewStatus;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

/** Review-owned implementation of ReviewProgressPort (LOS-1106). */
@Service
public class DefaultReviewProgressAdapter implements ReviewProgressPort {

  private final ReviewRepository reviewRepository;

  public DefaultReviewProgressAdapter(ReviewRepository reviewRepository) {
    this.reviewRepository = reviewRepository;
  }

  @Override
  public ReviewProgressData getReviewProgress(
      UUID userId, LocalDate startDate, LocalDate endDate, LocalDate today) {

    List<Review> userReviews = reviewRepository.findByUserId(userId);

    int finalizedCount =
        (int)
            userReviews.stream()
                .filter(r -> r.status() == ReviewStatus.FINALIZED)
                .filter(
                    r -> {
                      LocalDate rDate = r.startDate();
                      return !rDate.isBefore(startDate) && !rDate.isAfter(endDate);
                    })
                .count();

    List<Review> dailyReviews =
        userReviews.stream()
            .filter(
                r ->
                    (r.reviewType() == ReviewType.DAILY_MORNING
                            || r.reviewType() == ReviewType.DAILY_EVENING)
                        && r.status() == ReviewStatus.FINALIZED)
            .toList();

    int streak = 0;
    LocalDate checkDate = today;
    boolean found = true;
    while (found) {
      final LocalDate target = checkDate;
      boolean exists = dailyReviews.stream().anyMatch(r -> target.equals(r.startDate()));
      if (exists) {
        streak++;
        checkDate = checkDate.minusDays(1);
      } else if (checkDate.equals(today)) {
        checkDate = today.minusDays(1);
      } else {
        found = false;
      }
    }

    return new ReviewProgressData(streak, finalizedCount);
  }
}
