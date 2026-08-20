package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.WeekWidget;

/** Domain provider interface for the Today week widget (LOS-0607). */
@FunctionalInterface
public interface WeekWidgetProvider {
  WeekWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
