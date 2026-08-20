package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.TasksWidget;
import tech.buildwithpartha.lifeos.report.application.provider.TasksWidgetProvider;

/** Default zero-safe provider for the Today tasks widget (LOS-0607). */
@Component
public class DefaultTasksWidgetProvider implements TasksWidgetProvider {

  @Override
  public TasksWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return TasksWidget.empty();
  }
}
