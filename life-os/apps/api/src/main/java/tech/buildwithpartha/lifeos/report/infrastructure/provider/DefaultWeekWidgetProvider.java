package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.sprint.WeekPlanTodayPort;
import tech.buildwithpartha.lifeos.common.sprint.WeekPlanTodayPort.TodayWeekPlanSummary;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.WeekData;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.WeekWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.WeeklyGoalDto;
import tech.buildwithpartha.lifeos.report.application.provider.WeekWidgetProvider;

/** Real-data provider for the Today week progress and outcomes widget (LOS-1415). */
@Component
public class DefaultWeekWidgetProvider implements WeekWidgetProvider {

  private final WeekPlanTodayPort weekPlanTodayPort;

  public DefaultWeekWidgetProvider(WeekPlanTodayPort weekPlanTodayPort) {
    this.weekPlanTodayPort =
        Objects.requireNonNull(weekPlanTodayPort, "weekPlanTodayPort must not be null");
  }

  @Override
  public WeekWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    Optional<TodayWeekPlanSummary> planOpt =
        weekPlanTodayPort.getActiveWeeklyPlan(userId, localDate);

    if (planOpt.isEmpty()) {
      return WeekWidget.empty();
    }

    TodayWeekPlanSummary summary = planOpt.get();
    List<WeeklyGoalDto> outcomes =
        summary.outcomes().stream()
            .map(o -> new WeeklyGoalDto(o.id(), o.title(), o.completed()))
            .toList();

    return WeekWidget.success(
        new WeekData(summary.completedTasksCount(), summary.totalTasksCount(), outcomes));
  }
}
