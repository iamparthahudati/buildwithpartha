package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.CurrentNextBlockWidget;

/** Domain provider interface for the Today current/next block widget (LOS-0607). */
@FunctionalInterface
public interface CurrentNextBlockWidgetProvider {
  CurrentNextBlockWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
