package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.WeekWidget;
import tech.buildwithpartha.lifeos.report.application.provider.WeekWidgetProvider;

/** Default zero-safe provider for the Today week widget (LOS-0607). */
@Component
public class DefaultWeekWidgetProvider implements WeekWidgetProvider {

  @Override
  public WeekWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return WeekWidget.empty();
  }
}
