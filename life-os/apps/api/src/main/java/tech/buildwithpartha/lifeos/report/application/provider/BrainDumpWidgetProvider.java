package tech.buildwithpartha.lifeos.report.application.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.BrainDumpWidget;

/** Domain provider interface for the Today brain dump widget (LOS-0607). */
@FunctionalInterface
public interface BrainDumpWidgetProvider {
  BrainDumpWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId);
}
