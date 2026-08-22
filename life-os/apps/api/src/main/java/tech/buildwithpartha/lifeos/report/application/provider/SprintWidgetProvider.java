package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.SprintWidget;

/** Domain provider interface for the Today sprint widget (LOS-0607). */
@FunctionalInterface
public interface SprintWidgetProvider {
  SprintWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
