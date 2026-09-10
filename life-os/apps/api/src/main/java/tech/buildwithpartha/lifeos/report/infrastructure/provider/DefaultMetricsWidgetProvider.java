package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.habit.HabitTodayProjectionProvider;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.MetricsData;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.MetricsWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.TodayMetricDto;
import tech.buildwithpartha.lifeos.report.application.provider.MetricsWidgetProvider;

/** Real-data provider for the Today metrics summary strip (LOS-1415). */
@Component
public class DefaultMetricsWidgetProvider implements MetricsWidgetProvider {

  private final TodayTaskPort todayTaskPort;
  private final ProjectTodayPort projectTodayPort;
  private final HabitTodayProjectionProvider habitTodayProjectionProvider;
  private final Clock clock;

  public DefaultMetricsWidgetProvider(
      TodayTaskPort todayTaskPort,
      ProjectTodayPort projectTodayPort,
      HabitTodayProjectionProvider habitTodayProjectionProvider,
      Clock clock) {
    this.todayTaskPort = Objects.requireNonNull(todayTaskPort, "todayTaskPort must not be null");
    this.projectTodayPort =
        Objects.requireNonNull(projectTodayPort, "projectTodayPort must not be null");
    this.habitTodayProjectionProvider =
        Objects.requireNonNull(
            habitTodayProjectionProvider, "habitTodayProjectionProvider must not be null");
    this.clock = Objects.requireNonNull(clock, "clock must not be null");
  }

  @Override
  public MetricsWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    Instant now = clock.instant();
    Instant startOfDay = localDate.atStartOfDay(zoneId).toInstant();
    Instant endOfDay = localDate.plusDays(1).atStartOfDay(zoneId).toInstant();

    int completedTasks = todayTaskPort.getCompletedTasksCountToday(userId, startOfDay, endOfDay);
    int overdueTasks = todayTaskPort.getOverdueTasks(userId, now, zoneId, 0).totalCount();
    int activeProjectsCount = projectTodayPort.getActiveProjects(userId, 100).size();

    var habits = habitTodayProjectionProvider.getTodayHabits(userId);
    int habitsCount = habits.size();
    int completedHabits =
        (int) habits.stream().filter(h -> h.completedCount() >= h.targetCount()).count();

    if (completedTasks == 0 && overdueTasks == 0 && activeProjectsCount == 0 && habitsCount == 0) {
      return MetricsWidget.empty();
    }

    List<TodayMetricDto> metrics = new ArrayList<>();
    metrics.add(
        new TodayMetricDto(
            "tasks-completed-today",
            "Tasks completed",
            String.valueOf(completedTasks),
            "tasks",
            "STABLE",
            "GOOD"));
    metrics.add(
        new TodayMetricDto(
            "overdue-tasks",
            "Overdue tasks",
            String.valueOf(overdueTasks),
            "tasks",
            null,
            overdueTasks > 0 ? "WARNING" : "GOOD"));
    metrics.add(
        new TodayMetricDto(
            "active-projects",
            "Active projects",
            String.valueOf(activeProjectsCount),
            "projects",
            null,
            "NEUTRAL"));

    if (habitsCount > 0) {
      metrics.add(
          new TodayMetricDto(
              "habits-today",
              "Habits",
              completedHabits + "/" + habitsCount,
              "habits",
              null,
              completedHabits == habitsCount ? "GOOD" : "NEUTRAL"));
    }

    return MetricsWidget.success(new MetricsData(metrics));
  }
}
