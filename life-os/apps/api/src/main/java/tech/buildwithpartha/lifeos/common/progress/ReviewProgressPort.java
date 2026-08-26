package tech.buildwithpartha.lifeos.common.progress;

import java.time.LocalDate;
import java.util.UUID;

/** Domain-neutral read port for review progress metrics (LOS-1106). */
public interface ReviewProgressPort {

  ReviewProgressData getReviewProgress(
      UUID userId, LocalDate startDate, LocalDate endDate, LocalDate today);

  record ReviewProgressData(int dailyStreakDays, int finalizedReviewsCount) {}
}
