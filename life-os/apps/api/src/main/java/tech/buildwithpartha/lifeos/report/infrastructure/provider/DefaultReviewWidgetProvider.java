package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ReviewWidget;
import tech.buildwithpartha.lifeos.report.application.provider.ReviewWidgetProvider;

/** Default zero-safe provider for the Today review widget (LOS-0607). */
@Component
public class DefaultReviewWidgetProvider implements ReviewWidgetProvider {

  @Override
  public ReviewWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    return ReviewWidget.empty();
  }
}
