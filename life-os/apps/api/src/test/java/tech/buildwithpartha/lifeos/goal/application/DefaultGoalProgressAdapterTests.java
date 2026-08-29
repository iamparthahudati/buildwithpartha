package tech.buildwithpartha.lifeos.goal.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tech.buildwithpartha.lifeos.common.progress.GoalProgressPort;
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckIn;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckInRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;

@ExtendWith(MockitoExtension.class)
class DefaultGoalProgressAdapterTests {

  @Mock private GoalRepository goalRepository;
  @Mock private GoalCheckInRepository goalCheckInRepository;

  private DefaultGoalProgressAdapter adapter;
  private UUID userId;

  @BeforeEach
  void setUp() {
    adapter = new DefaultGoalProgressAdapter(goalRepository, goalCheckInRepository);
    userId = UUID.randomUUID();
  }

  @Test
  void aggregatesGoalProgressAndRecentCheckins() {
    Instant now = Instant.parse("2026-08-26T10:00:00Z");

    Goal goal1 =
        new Goal(
            UUID.randomUUID(),
            userId,
            "Goal 1",
            Optional.empty(),
            "Health",
            GoalProgressType.PERCENTAGE,
            Optional.of(BigDecimal.valueOf(100)),
            BigDecimal.valueOf(50),
            Optional.empty(),
            Optional.empty(),
            GoalStatus.ACTIVE,
            CheckInCadence.WEEKLY,
            false,
            now,
            now,
            0L);

    Goal goal2Archived =
        new Goal(
            UUID.randomUUID(),
            userId,
            "Goal 2",
            Optional.empty(),
            "Health",
            GoalProgressType.PERCENTAGE,
            Optional.of(BigDecimal.valueOf(100)),
            BigDecimal.valueOf(100),
            Optional.empty(),
            Optional.empty(),
            GoalStatus.COMPLETED,
            CheckInCadence.WEEKLY,
            true,
            now,
            now,
            0L);

    GoalCheckIn recentCheckIn =
        new GoalCheckIn(
            UUID.randomUUID(),
            goal1.id(),
            userId,
            BigDecimal.valueOf(50),
            Optional.empty(),
            now.minus(2, ChronoUnit.DAYS),
            now.minus(2, ChronoUnit.DAYS));

    when(goalRepository.findByUserId(userId)).thenReturn(List.of(goal1, goal2Archived));
    when(goalCheckInRepository.findByGoalId(goal1.id())).thenReturn(List.of(recentCheckIn));

    GoalProgressPort.GoalProgressData data = adapter.getGoalProgress(userId, "Health", now);

    assertEquals(1, data.totalCount());
    assertEquals(50.0, data.averageProgressPercentage());
    assertEquals(1, data.goalsWithRecentCheckinCount());
  }

  @Test
  void handlesEmptyGoals() {
    Instant now = Instant.now();
    when(goalRepository.findByUserId(userId)).thenReturn(List.of());

    GoalProgressPort.GoalProgressData data = adapter.getGoalProgress(userId, null, now);

    assertEquals(0, data.totalCount());
    assertEquals(0.0, data.averageProgressPercentage());
    assertEquals(0, data.goalsWithRecentCheckinCount());
  }
}
