package tech.buildwithpartha.lifeos.report.infrastructure.provider;

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
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort.ProjectTaskCountRecord;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ActiveProjectDto;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ActiveProjectsData;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ActiveProjectsWidget;
import tech.buildwithpartha.lifeos.report.application.provider.ActiveProjectsWidgetProvider;

/** Real-data provider for the Today active projects widget (LOS-1415). */
@Component
public class DefaultActiveProjectsWidgetProvider implements ActiveProjectsWidgetProvider {

  private final ProjectTodayPort projectTodayPort;
  private final TodayTaskPort todayTaskPort;

  public DefaultActiveProjectsWidgetProvider(
      ProjectTodayPort projectTodayPort, TodayTaskPort todayTaskPort) {
    this.projectTodayPort =
        Objects.requireNonNull(projectTodayPort, "projectTodayPort must not be null");
    this.todayTaskPort = Objects.requireNonNull(todayTaskPort, "todayTaskPort must not be null");
  }

  @Override
  public ActiveProjectsWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    List<TodayProjectSummary> projects = projectTodayPort.getActiveProjects(userId, 5);

    if (projects.isEmpty()) {
      return ActiveProjectsWidget.empty();
    }

    Map<UUID, ProjectTaskCountRecord> taskCounts = todayTaskPort.getProjectTaskCounts(userId);

    List<ActiveProjectDto> dtos =
        projects.stream()
            .map(
                p -> {
                  ProjectTaskCountRecord counts =
                      taskCounts.getOrDefault(p.id(), new ProjectTaskCountRecord(0, 0));
                  return new ActiveProjectDto(
                      p.id(),
                      p.name(),
                      p.color(),
                      counts.completedCount(),
                      counts.totalCount(),
                      p.status());
                })
            .toList();

    return ActiveProjectsWidget.success(new ActiveProjectsData(dtos));
  }
}
