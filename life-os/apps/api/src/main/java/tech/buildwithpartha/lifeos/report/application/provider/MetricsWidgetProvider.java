package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.MetricsWidget;

/** Domain provider interface for the Today metrics widget (LOS-0607). */
@FunctionalInterface
public interface MetricsWidgetProvider {
  MetricsWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
