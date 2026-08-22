package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ReviewWidget;

/** Domain provider interface for the Today review widget (LOS-0607). */
@FunctionalInterface
public interface ReviewWidgetProvider {
  ReviewWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
