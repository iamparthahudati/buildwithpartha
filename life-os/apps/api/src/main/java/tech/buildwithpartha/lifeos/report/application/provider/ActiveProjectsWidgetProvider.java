package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ActiveProjectsWidget;

/** Domain provider interface for the Today active projects widget (LOS-0607). */
@FunctionalInterface
public interface ActiveProjectsWidgetProvider {
  ActiveProjectsWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
