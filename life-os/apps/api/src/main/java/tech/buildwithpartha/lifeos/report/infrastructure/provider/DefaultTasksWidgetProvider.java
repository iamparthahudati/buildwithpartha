package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort.TodayProjectSummary;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort.TodayTaskRecord;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.TasksData;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.TasksWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.TodayTaskDto;
import tech.buildwithpartha.lifeos.report.application.provider.TasksWidgetProvider;

/** Real-data provider for the Today tasks widget (LOS-1415). */
@Component
public class DefaultTasksWidgetProvider implements TasksWidgetProvider {

  private final TodayTaskPort todayTaskPort;
  private final ProjectTodayPort projectTodayPort;
  private final Clock clock;

  public DefaultTasksWidgetProvider(
      TodayTaskPort todayTaskPort, ProjectTodayPort projectTodayPort, Clock clock) {
    this.todayTaskPort = Objects.requireNonNull(todayTaskPort, "todayTaskPort must not be null");
    this.projectTodayPort =
        Objects.requireNonNull(projectTodayPort, "projectTodayPort must not be null");
    this.clock = Objects.requireNonNull(clock, "clock must not be null");
  }

  @Override
  public TasksWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    Instant now = clock.instant();
    List<TodayTaskRecord> taskRecords =
        todayTaskPort.getTasksDueToday(userId, localDate, zoneId, now, 20);

    if (taskRecords.isEmpty()) {
      return TasksWidget.empty();
    }

    Map<UUID, TodayProjectSummary> projectMap = projectTodayPort.getProjectSummaries(userId);

    List<TodayTaskDto> taskDtos =
        taskRecords.stream()
            .map(
                task -> {
                  TodayProjectSummary project = task.projectId().map(projectMap::get).orElse(null);
                  String projectName = project != null ? project.name() : null;
                  String projectColor = project != null ? project.color() : null;
                  return new TodayTaskDto(
                      task.id(),
                      task.title(),
                      task.projectId().orElse(null),
                      projectName,
                      projectColor,
                      task.priority(),
                      task.dueDate().orElse(null),
                      task.completed(),
                      task.isOverdue());
                })
            .toList();

    return TasksWidget.success(new TasksData(taskDtos));
  }
}
