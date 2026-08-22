package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ScheduleWidget;
import tech.buildwithpartha.lifeos.report.application.provider.ScheduleWidgetProvider;

/** Default zero-safe provider for the Today schedule widget (LOS-0607). */
@Component
public class DefaultScheduleWidgetProvider implements ScheduleWidgetProvider {

  @Override
  public ScheduleWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return ScheduleWidget.empty();
  }
}
