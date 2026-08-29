package tech.buildwithpartha.lifeos.common.progress;

import java.time.Instant;
import java.util.UUID;

/** Domain-neutral read port for goal progress metrics (LOS-1106). */
public interface GoalProgressPort {

  GoalProgressData getGoalProgress(UUID userId, String category, Instant now);

  record GoalProgressData(
      int totalCount, Double averageProgressPercentage, int goalsWithRecentCheckinCount) {}
}
