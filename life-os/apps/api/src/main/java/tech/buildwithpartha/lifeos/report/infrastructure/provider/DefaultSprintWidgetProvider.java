package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.SprintWidget;
import tech.buildwithpartha.lifeos.report.application.provider.SprintWidgetProvider;

/** Default zero-safe provider for the Today sprint widget (LOS-0607). */
@Component
public class DefaultSprintWidgetProvider implements SprintWidgetProvider {

  @Override
  public SprintWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return SprintWidget.empty();
  }
}
