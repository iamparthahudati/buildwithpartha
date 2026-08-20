package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.MitWidget;

/** Domain provider interface for the Today MIT widget (LOS-0607). */
@FunctionalInterface
public interface MitWidgetProvider {
  MitWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
