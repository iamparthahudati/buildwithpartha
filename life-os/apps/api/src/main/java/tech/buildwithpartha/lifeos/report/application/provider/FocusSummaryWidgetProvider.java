package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.FocusSummaryWidget;

/** Domain provider interface for the Today focus summary widget (LOS-0607). */
@FunctionalInterface
public interface FocusSummaryWidgetProvider {
  FocusSummaryWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
