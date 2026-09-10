package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.sprint.WeekPlanTodayPort;
import tech.buildwithpartha.lifeos.common.sprint.WeekPlanTodayPort.TodayWeekPlanSummary;
import tech.buildwithpartha.lifeos.common.sprint.WeekPlanTodayPort.TodayWeeklyGoalSummary;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.WeekWidget;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

class DefaultWeekWidgetProviderTests {

  private WeekPlanTodayPort weekPlanTodayPort;
  private DefaultWeekWidgetProvider provider;

  @BeforeEach
  void setUp() {
    weekPlanTodayPort = mock(WeekPlanTodayPort.class);
    provider = new DefaultWeekWidgetProvider(weekPlanTodayPort);
  }

  @Test
  void returnsEmptyWhenNoActiveWeekPlan() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    given(weekPlanTodayPort.getActiveWeeklyPlan(userId, today)).willReturn(Optional.empty());

    WeekWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(widget.data().completedTasksCount()).isEqualTo(0);
    assertThat(widget.data().totalTasksCount()).isEqualTo(0);
    assertThat(widget.data().outcomes()).isEmpty();
  }

  @Test
  void returnsWeekPlanSummary() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    UUID goalId = UUID.randomUUID();
    TodayWeekPlanSummary summary =
        new TodayWeekPlanSummary(
            4, 8, List.of(new TodayWeeklyGoalSummary(goalId, "Launch v1", true)));

    given(weekPlanTodayPort.getActiveWeeklyPlan(userId, today)).willReturn(Optional.of(summary));

    WeekWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data().completedTasksCount()).isEqualTo(4);
    assertThat(widget.data().totalTasksCount()).isEqualTo(8);
    assertThat(widget.data().outcomes()).hasSize(1);
    assertThat(widget.data().outcomes().get(0).title()).isEqualTo("Launch v1");
    assertThat(widget.data().outcomes().get(0).completed()).isTrue();
  }
}
