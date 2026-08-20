package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.TasksWidget;

/** Domain provider interface for the Today tasks widget (LOS-0607). */
@FunctionalInterface
public interface TasksWidgetProvider {
  TasksWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
