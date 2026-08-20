package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.HabitsWidget;
import tech.buildwithpartha.lifeos.report.application.provider.HabitsWidgetProvider;

/** Default zero-safe provider for the Today habits widget (LOS-0607). */
@Component
public class DefaultHabitsWidgetProvider implements HabitsWidgetProvider {

  @Override
  public HabitsWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return HabitsWidget.empty();
  }
}
