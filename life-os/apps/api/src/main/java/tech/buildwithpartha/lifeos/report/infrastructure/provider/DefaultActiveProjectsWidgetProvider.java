package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ActiveProjectsWidget;
import tech.buildwithpartha.lifeos.report.application.provider.ActiveProjectsWidgetProvider;

/** Default zero-safe provider for the Today active projects widget (LOS-0607). */
@Component
public class DefaultActiveProjectsWidgetProvider implements ActiveProjectsWidgetProvider {

  @Override
  public ActiveProjectsWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return ActiveProjectsWidget.empty();
  }
}
