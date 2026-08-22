package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.CurrentNextBlockWidget;
import tech.buildwithpartha.lifeos.report.application.provider.CurrentNextBlockWidgetProvider;

/** Default zero-safe provider for the Today current/next block widget (LOS-0607). */
@Component
public class DefaultCurrentNextBlockWidgetProvider implements CurrentNextBlockWidgetProvider {

  @Override
  public CurrentNextBlockWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return CurrentNextBlockWidget.empty();
  }
}
