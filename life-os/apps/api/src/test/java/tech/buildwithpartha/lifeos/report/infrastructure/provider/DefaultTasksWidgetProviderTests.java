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
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort.TodayProjectSummary;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort.TodayTaskRecord;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.TasksWidget;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

class DefaultTasksWidgetProviderTests {

  private TodayTaskPort todayTaskPort;
  private ProjectTodayPort projectTodayPort;
  private Clock clock;
  private DefaultTasksWidgetProvider provider;

  @BeforeEach
  void setUp() {
    todayTaskPort = mock(TodayTaskPort.class);
    projectTodayPort = mock(ProjectTodayPort.class);
    clock = Clock.fixed(Instant.parse("2026-09-10T10:00:00Z"), ZoneId.of("UTC"));
    provider = new DefaultTasksWidgetProvider(todayTaskPort, projectTodayPort, clock);
  }

  @Test
  void returnsEmptyWhenNoTasksDueToday() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    given(todayTaskPort.getTasksDueToday(userId, today, zoneId, clock.instant(), 20))
        .willReturn(List.of());

    TasksWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(widget.data().tasks()).isEmpty();
  }

  @Test
  void returnsTasksEnrichedWithProjects() {
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    TodayTaskRecord record =
        new TodayTaskRecord(
            taskId,
            "Complete tests",
            Optional.of(projectId),
            "P2",
            Optional.of(today),
            false,
            false);

    given(todayTaskPort.getTasksDueToday(userId, today, zoneId, clock.instant(), 20))
        .willReturn(List.of(record));
    given(projectTodayPort.getProjectSummaries(userId))
        .willReturn(
            Map.of(projectId, new TodayProjectSummary(projectId, "Platform", "#10B981", "ACTIVE")));

    TasksWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data().tasks()).hasSize(1);
    assertThat(widget.data().tasks().get(0).title()).isEqualTo("Complete tests");
    assertThat(widget.data().tasks().get(0).projectName()).isEqualTo("Platform");
    assertThat(widget.data().tasks().get(0).projectColor()).isEqualTo("#10B981");
  }
}
