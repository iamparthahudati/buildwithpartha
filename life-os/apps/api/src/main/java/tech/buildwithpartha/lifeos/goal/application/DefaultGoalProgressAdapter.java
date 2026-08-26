package tech.buildwithpartha.lifeos.goal.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.progress.GoalProgressPort;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckIn;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckInRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;

/** Goal-owned implementation of GoalProgressPort (LOS-1106). */
@Service
public class DefaultGoalProgressAdapter implements GoalProgressPort {

  private final GoalRepository goalRepository;
  private final GoalCheckInRepository goalCheckInRepository;

  public DefaultGoalProgressAdapter(
      GoalRepository goalRepository, GoalCheckInRepository goalCheckInRepository) {
    this.goalRepository = goalRepository;
    this.goalCheckInRepository = goalCheckInRepository;
  }

  @Override
  public GoalProgressData getGoalProgress(UUID userId, String category, Instant now) {
    List<Goal> goals = goalRepository.findByUserId(userId);
    List<Goal> filtered =
        goals.stream()
            .filter(g -> !g.archived())
            .filter(g -> category == null || g.category().equalsIgnoreCase(category))
            .toList();

    int totalCount = filtered.size();
    Double avgProgress = 0.0;
    int recentCheckinsCount = 0;

    if (totalCount > 0) {
      BigDecimal totalProgress = BigDecimal.ZERO;
      Instant sevenDaysAgo = now.minus(7, ChronoUnit.DAYS);

      for (Goal g : filtered) {
        totalProgress = totalProgress.add(g.calculateProgressPercentage());
        List<GoalCheckIn> checkIns = goalCheckInRepository.findByGoalId(g.id());
        boolean hasRecent = checkIns.stream().anyMatch(c -> !c.createdAt().isBefore(sevenDaysAgo));
        if (hasRecent) {
          recentCheckinsCount++;
        }
      }

      avgProgress =
          totalProgress
              .divide(BigDecimal.valueOf(totalCount), 1, RoundingMode.HALF_UP)
              .doubleValue();
    }

    return new GoalProgressData(totalCount, avgProgress, recentCheckinsCount);
  }
}
