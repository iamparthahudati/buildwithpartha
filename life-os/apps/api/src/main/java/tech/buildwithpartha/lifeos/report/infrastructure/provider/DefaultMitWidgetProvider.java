package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.focus.FocusActiveTaskPort;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort.TodayProjectSummary;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort.TodayTaskRecord;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.MitData;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.MitWidget;
import tech.buildwithpartha.lifeos.report.application.provider.MitWidgetProvider;

/** Real-data provider for the Today MIT (Most Important Task) widget (LOS-1415). */
@Component
public class DefaultMitWidgetProvider implements MitWidgetProvider {

  private final TodayTaskPort todayTaskPort;
  private final ProjectTodayPort projectTodayPort;
  private final FocusActiveTaskPort focusActiveTaskPort;

  public DefaultMitWidgetProvider(
      TodayTaskPort todayTaskPort,
      ProjectTodayPort projectTodayPort,
      FocusActiveTaskPort focusActiveTaskPort) {
    this.todayTaskPort = Objects.requireNonNull(todayTaskPort, "todayTaskPort must not be null");
    this.projectTodayPort =
        Objects.requireNonNull(projectTodayPort, "projectTodayPort must not be null");
    this.focusActiveTaskPort =
        Objects.requireNonNull(focusActiveTaskPort, "focusActiveTaskPort must not be null");
  }

  @Override
  public MitWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    Optional<TodayTaskRecord> mitOpt = todayTaskPort.getMitTask(userId, localDate, zoneId);
    if (mitOpt.isEmpty()) {
      return MitWidget.empty();
    }

    TodayTaskRecord task = mitOpt.get();
    Map<UUID, TodayProjectSummary> projectMap = projectTodayPort.getProjectSummaries(userId);
    TodayProjectSummary project = task.projectId().map(projectMap::get).orElse(null);
    String projectName = project != null ? project.name() : null;
    String projectColor = project != null ? project.color() : null;
    boolean focusActive =
        focusActiveTaskPort.getActiveFocusTaskId(userId).map(task.id()::equals).orElse(false);

    MitData mitData =
        new MitData(
            task.id(),
            task.title(),
            task.projectId().orElse(null),
            projectName,
            projectColor,
            task.priority(),
            task.dueDate().orElse(null),
            task.completed(),
            focusActive);

    return MitWidget.success(mitData);
  }
}
