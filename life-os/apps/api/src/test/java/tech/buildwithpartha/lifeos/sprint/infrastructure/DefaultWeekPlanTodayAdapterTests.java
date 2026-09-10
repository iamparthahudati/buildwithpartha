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
import tech.buildwithpartha.lifeos.common.sprint.WeekPlanTodayPort.TodayWeekPlanSummary;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlan;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanItem;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanOutcome;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanRepository;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanStatus;

class DefaultWeekPlanTodayAdapterTests {

  private WeeklyPlanRepository weeklyPlanRepository;
  private DefaultWeekPlanTodayAdapter adapter;

  @BeforeEach
  void setUp() {
    weeklyPlanRepository = mock(WeeklyPlanRepository.class);
    adapter = new DefaultWeekPlanTodayAdapter(weeklyPlanRepository);
  }

  @Test
  void retrievesActiveWeeklyPlanSummary() {
    UUID userId = UUID.randomUUID();
    UUID planId = UUID.randomUUID();
    UUID outcomeId = UUID.randomUUID();
    UUID outcome2Id = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);

    WeeklyPlanOutcome outcome1 = new WeeklyPlanOutcome(outcomeId, "Finish Release", 1);
    WeeklyPlanOutcome outcome2 = new WeeklyPlanOutcome(outcome2Id, "Pending Goal", 2);

    WeeklyPlanItem item1 =
        new WeeklyPlanItem(
            UUID.randomUUID(),
            UUID.randomUUID(),
            Optional.of(outcomeId),
            Optional.of(today),
            60,
            1,
            "Release task",
            "DONE");

    WeeklyPlanItem item2 =
        new WeeklyPlanItem(
            UUID.randomUUID(),
            UUID.randomUUID(),
            Optional.of(outcome2Id),
            Optional.of(today),
            30,
            2,
            "Pending task",
            "IN_PROGRESS");

    WeeklyPlan plan =
        new WeeklyPlan(
            planId,
            userId,
            LocalDate.of(2026, 9, 7),
            LocalDate.of(2026, 9, 13),
            "UTC",
            1,
            1,
            WeeklyPlanStatus.DRAFT,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            List.of(),
            List.of(outcome1, outcome2),
            List.of(item1, item2),
            Instant.now(),
            Instant.now(),
            1L);

    given(weeklyPlanRepository.findByUserId(userId)).willReturn(List.of(plan));

    Optional<TodayWeekPlanSummary> result = adapter.getActiveWeeklyPlan(userId, today);

    assertThat(result).isPresent();
    assertThat(result.get().totalTasksCount()).isEqualTo(2);
    assertThat(result.get().completedTasksCount()).isEqualTo(1);
    assertThat(result.get().outcomes()).hasSize(2);
    assertThat(result.get().outcomes().get(0).completed()).isTrue();
    assertThat(result.get().outcomes().get(1).completed()).isFalse();
  }

  @Test
  void returnsEmptyWhenNoWeeklyPlanFound() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);

    given(weeklyPlanRepository.findByUserId(userId)).willReturn(List.of());

    Optional<TodayWeekPlanSummary> result = adapter.getActiveWeeklyPlan(userId, today);

    assertThat(result).isEmpty();
  }
}
