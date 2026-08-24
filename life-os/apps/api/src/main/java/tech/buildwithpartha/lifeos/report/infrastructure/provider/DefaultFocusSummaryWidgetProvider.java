package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.report.application.DailyTimeSummary;
import tech.buildwithpartha.lifeos.report.application.TimeGoalService;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.FocusSummaryData;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.FocusSummaryWidget;
import tech.buildwithpartha.lifeos.report.application.provider.FocusSummaryWidgetProvider;

/** Default zero-safe provider for the Today focus summary widget (LOS-0607). */
@Component
public class DefaultFocusSummaryWidgetProvider implements FocusSummaryWidgetProvider {

  private final TimeGoalService timeGoalService;

  public DefaultFocusSummaryWidgetProvider(TimeGoalService timeGoalService) {
    this.timeGoalService = timeGoalService;
  }

  @Override
  public FocusSummaryWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    DailyTimeSummary summary = timeGoalService.getDailySummary(userId, localDate, zoneId.getId());
    FocusSummaryData data =
        new FocusSummaryData(
            summary.actualFocusMinutes(),
            summary.plannedFocusMinutes(),
            summary.activeSessionTimerSummary(),
            summary.sessionActive(),
            summary.dailyFocusTargetMinutes(),
            summary.comparisonMinutes(),
            summary.comparisonSource(),
            summary.progressPercentage());
    return summary.hasData() ? FocusSummaryWidget.success(data) : FocusSummaryWidget.empty();
  }
}
