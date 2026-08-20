package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.MitWidget;
import tech.buildwithpartha.lifeos.report.application.provider.MitWidgetProvider;

/** Default zero-safe provider for the Today MIT widget (LOS-0607). */
@Component
public class DefaultMitWidgetProvider implements MitWidgetProvider {

  @Override
  public MitWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return MitWidget.empty();
  }
}
