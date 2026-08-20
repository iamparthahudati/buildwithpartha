package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.FocusSummaryWidget;
import tech.buildwithpartha.lifeos.report.application.provider.FocusSummaryWidgetProvider;

/** Default zero-safe provider for the Today focus summary widget (LOS-0607). */
@Component
public class DefaultFocusSummaryWidgetProvider implements FocusSummaryWidgetProvider {

  @Override
  public FocusSummaryWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return FocusSummaryWidget.empty();
  }
}
