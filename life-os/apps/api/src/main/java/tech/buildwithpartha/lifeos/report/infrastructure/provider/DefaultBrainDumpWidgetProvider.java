package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.BrainDumpWidget;
import tech.buildwithpartha.lifeos.report.application.provider.BrainDumpWidgetProvider;

/** Default zero-safe provider for the Today brain dump widget (LOS-0607). */
@Component
public class DefaultBrainDumpWidgetProvider implements BrainDumpWidgetProvider {

  @Override
  public BrainDumpWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return BrainDumpWidget.empty();
  }
}
