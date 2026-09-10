package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.habit.HabitTodayProjection;
import tech.buildwithpartha.lifeos.common.habit.HabitTodayProjectionProvider;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort.TodayProjectSummary;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort.TodayOverdueRecord;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.MetricsWidget;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

class DefaultMetricsWidgetProviderTests {

  private TodayTaskPort todayTaskPort;
  private ProjectTodayPort projectTodayPort;
  private HabitTodayProjectionProvider habitTodayProjectionProvider;
  private Clock clock;
  private DefaultMetricsWidgetProvider provider;

  @BeforeEach
  void setUp() {
    todayTaskPort = mock(TodayTaskPort.class);
    projectTodayPort = mock(ProjectTodayPort.class);
    habitTodayProjectionProvider = mock(HabitTodayProjectionProvider.class);
    clock = Clock.fixed(Instant.parse("2026-09-10T10:00:00Z"), ZoneId.of("UTC"));
    provider =
        new DefaultMetricsWidgetProvider(
            todayTaskPort, projectTodayPort, habitTodayProjectionProvider, clock);
  }

  @Test
  void returnsEmptyWhenNoActivityRecorded() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");
    Instant start = today.atStartOfDay(zoneId).toInstant();
    Instant end = today.plusDays(1).atStartOfDay(zoneId).toInstant();

    given(todayTaskPort.getCompletedTasksCountToday(userId, start, end)).willReturn(0);
    given(todayTaskPort.getOverdueTasks(userId, clock.instant(), zoneId, 0))
        .willReturn(new TodayOverdueRecord(0, List.of()));
    given(projectTodayPort.getActiveProjects(userId, 100)).willReturn(List.of());
    given(habitTodayProjectionProvider.getTodayHabits(userId)).willReturn(List.of());

    MetricsWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(widget.data().metrics()).isEmpty();
  }

  @Test
  void returnsMetricsSummaryWhenActivityExists() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");
    Instant start = today.atStartOfDay(zoneId).toInstant();
    Instant end = today.plusDays(1).atStartOfDay(zoneId).toInstant();

    given(todayTaskPort.getCompletedTasksCountToday(userId, start, end)).willReturn(4);
    given(todayTaskPort.getOverdueTasks(userId, clock.instant(), zoneId, 0))
        .willReturn(new TodayOverdueRecord(1, List.of()));
    given(projectTodayPort.getActiveProjects(userId, 100))
        .willReturn(List.of(new TodayProjectSummary(UUID.randomUUID(), "P1", "#fff", "ACTIVE")));
    given(habitTodayProjectionProvider.getTodayHabits(userId))
        .willReturn(
            List.of(
                new HabitTodayProjection(
                    UUID.randomUUID(), "Exercise", "DAILY", 1, 1, today, "UTC", false, 3)));

    MetricsWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data().metrics()).hasSize(4);
    assertThat(widget.data().metrics().get(0).key()).isEqualTo("tasks-completed-today");
    assertThat(widget.data().metrics().get(0).value()).isEqualTo("4");
    assertThat(widget.data().metrics().get(1).key()).isEqualTo("overdue-tasks");
    assertThat(widget.data().metrics().get(1).value()).isEqualTo("1");
    assertThat(widget.data().metrics().get(1).status()).isEqualTo("WARNING");
    assertThat(widget.data().metrics().get(3).key()).isEqualTo("habits-today");
    assertThat(widget.data().metrics().get(3).value()).isEqualTo("1/1");
    assertThat(widget.data().metrics().get(3).status()).isEqualTo("GOOD");
  }

  @Test
  void returnsMetricsSummaryWhenOverdueZeroAndHabitsPartiallyDone() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");
    Instant start = today.atStartOfDay(zoneId).toInstant();
    Instant end = today.plusDays(1).atStartOfDay(zoneId).toInstant();

    given(todayTaskPort.getCompletedTasksCountToday(userId, start, end)).willReturn(0);
    given(todayTaskPort.getOverdueTasks(userId, clock.instant(), zoneId, 0))
        .willReturn(new TodayOverdueRecord(0, List.of()));
    given(projectTodayPort.getActiveProjects(userId, 100))
        .willReturn(List.of(new TodayProjectSummary(UUID.randomUUID(), "P1", "#fff", "ACTIVE")));
    given(habitTodayProjectionProvider.getTodayHabits(userId))
        .willReturn(
            List.of(
                new HabitTodayProjection(
                    UUID.randomUUID(), "Meditate", "DAILY", 2, 1, today, "UTC", false, 1)));

    MetricsWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data().metrics().get(1).status()).isEqualTo("GOOD");
    assertThat(widget.data().metrics().get(3).status()).isEqualTo("NEUTRAL");
  }
}
