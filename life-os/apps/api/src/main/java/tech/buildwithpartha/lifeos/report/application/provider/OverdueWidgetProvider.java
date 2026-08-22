package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.OverdueWidget;

/** Domain provider interface for the Today overdue widget (LOS-0607). */
@FunctionalInterface
public interface OverdueWidgetProvider {
  OverdueWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
