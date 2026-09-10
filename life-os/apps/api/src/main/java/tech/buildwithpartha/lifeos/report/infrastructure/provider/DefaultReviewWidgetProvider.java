package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.sprint.ReviewTodayPort;
import tech.buildwithpartha.lifeos.common.sprint.ReviewTodayPort.TodayReviewSummary;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ReviewData;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ReviewWidget;
import tech.buildwithpartha.lifeos.report.application.provider.ReviewWidgetProvider;

/** Real-data provider for the Today daily review prompt widget (LOS-1415). */
@Component
public class DefaultReviewWidgetProvider implements ReviewWidgetProvider {

  private final ReviewTodayPort reviewTodayPort;

  public DefaultReviewWidgetProvider(ReviewTodayPort reviewTodayPort) {
    this.reviewTodayPort =
        Objects.requireNonNull(reviewTodayPort, "reviewTodayPort must not be null");
  }

  @Override
  public ReviewWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    TodayReviewSummary review = reviewTodayPort.getTodayReview(userId, localDate);
    ReviewData data =
        new ReviewData(
            review.morningReviewCompleted(),
            review.eveningReviewCompleted(),
            review.morningReviewState(),
            review.eveningReviewState());

    boolean hasAnyReviewActivity =
        review.morningReviewCompleted()
            || review.eveningReviewCompleted()
            || !"NOT_STARTED".equals(review.morningReviewState())
            || !"NOT_STARTED".equals(review.eveningReviewState());

    return hasAnyReviewActivity ? ReviewWidget.success(data) : ReviewWidget.empty();
  }
}
