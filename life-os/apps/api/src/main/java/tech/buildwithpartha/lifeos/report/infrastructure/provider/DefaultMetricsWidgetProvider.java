package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.MetricsWidget;
import tech.buildwithpartha.lifeos.report.application.provider.MetricsWidgetProvider;

/** Default zero-safe provider for the Today metrics widget (LOS-0607). */
@Component
public class DefaultMetricsWidgetProvider implements MetricsWidgetProvider {

  @Override
  public MetricsWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return MetricsWidget.empty();
  }
}
