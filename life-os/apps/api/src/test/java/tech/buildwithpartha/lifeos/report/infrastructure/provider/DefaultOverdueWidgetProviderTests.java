package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort.TodayOverdueRecord;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort.TodayTaskRecord;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.OverdueWidget;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

class DefaultOverdueWidgetProviderTests {

  private TodayTaskPort todayTaskPort;
  private ProjectTodayPort projectTodayPort;
  private Clock clock;
  private DefaultOverdueWidgetProvider provider;

  @BeforeEach
  void setUp() {
    todayTaskPort = mock(TodayTaskPort.class);
    projectTodayPort = mock(ProjectTodayPort.class);
    clock = Clock.fixed(Instant.parse("2026-09-10T10:00:00Z"), ZoneId.of("UTC"));
    provider = new DefaultOverdueWidgetProvider(todayTaskPort, projectTodayPort, clock);
  }

  @Test
  void returnsEmptyWhenNoOverdueTasks() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    given(todayTaskPort.getOverdueTasks(userId, clock.instant(), zoneId, 5))
        .willReturn(new TodayOverdueRecord(0, List.of()));

    OverdueWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(widget.data().totalCount()).isEqualTo(0);
    assertThat(widget.data().topOverdueTasks()).isEmpty();
  }

  @Test
  void returnsOverdueTasksSummary() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    UUID taskId = UUID.randomUUID();
    TodayTaskRecord overdueTask =
        new TodayTaskRecord(
            taskId,
            "Late report",
            Optional.empty(),
            "P1",
            Optional.of(today.minusDays(1)),
            false,
            true);

    given(todayTaskPort.getOverdueTasks(userId, clock.instant(), zoneId, 5))
        .willReturn(new TodayOverdueRecord(3, List.of(overdueTask)));
    given(projectTodayPort.getProjectSummaries(userId)).willReturn(Map.of());

    OverdueWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data().totalCount()).isEqualTo(3);
    assertThat(widget.data().topOverdueTasks()).hasSize(1);
    assertThat(widget.data().topOverdueTasks().get(0).title()).isEqualTo("Late report");
    assertThat(widget.data().topOverdueTasks().get(0).isOverdue()).isTrue();
  }
}
