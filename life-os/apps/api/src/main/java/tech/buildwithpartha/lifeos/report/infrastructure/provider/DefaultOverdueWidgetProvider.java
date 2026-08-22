package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.OverdueWidget;
import tech.buildwithpartha.lifeos.report.application.provider.OverdueWidgetProvider;

/** Default zero-safe provider for the Today overdue widget (LOS-0607). */
@Component
public class DefaultOverdueWidgetProvider implements OverdueWidgetProvider {

  @Override
  public OverdueWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return OverdueWidget.empty();
  }
}
