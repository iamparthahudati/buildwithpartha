package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.HabitsWidget;

/** Domain provider interface for the Today habits widget (LOS-0607). */
@FunctionalInterface
public interface HabitsWidgetProvider {
  HabitsWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
