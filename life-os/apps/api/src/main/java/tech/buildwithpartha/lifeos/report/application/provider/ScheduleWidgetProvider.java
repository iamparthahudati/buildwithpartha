package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ScheduleWidget;

/** Domain provider interface for the Today schedule widget (LOS-0607). */
@FunctionalInterface
public interface ScheduleWidgetProvider {
  ScheduleWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
