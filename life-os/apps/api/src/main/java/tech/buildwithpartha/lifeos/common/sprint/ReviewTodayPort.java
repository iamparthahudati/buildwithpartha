package tech.buildwithpartha.lifeos.common.sprint;

import java.time.LocalDate;
import java.util.UUID;

/** Domain-neutral Review read port for Today dashboard aggregation (LOS-1415). */
public interface ReviewTodayPort {

  TodayReviewSummary getTodayReview(UUID userId, LocalDate localDate);

  record TodayReviewSummary(
      boolean morningReviewCompleted,
      boolean eveningReviewCompleted,
      String morningReviewState,
      String eveningReviewState) {}
}
