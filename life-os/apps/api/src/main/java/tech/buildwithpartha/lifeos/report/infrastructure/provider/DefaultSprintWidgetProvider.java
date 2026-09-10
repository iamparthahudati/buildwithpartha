package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.sprint.SprintTodayPort;
import tech.buildwithpartha.lifeos.common.sprint.SprintTodayPort.TodaySprintSummary;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.SprintData;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.SprintWidget;
import tech.buildwithpartha.lifeos.report.application.provider.SprintWidgetProvider;

/** Real-data provider for the Today sprint widget (LOS-1415). */
@Component
public class DefaultSprintWidgetProvider implements SprintWidgetProvider {

  private final SprintTodayPort sprintTodayPort;

  public DefaultSprintWidgetProvider(SprintTodayPort sprintTodayPort) {
    this.sprintTodayPort =
        Objects.requireNonNull(sprintTodayPort, "sprintTodayPort must not be null");
  }

  @Override
  public SprintWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    Optional<TodaySprintSummary> sprintOpt = sprintTodayPort.getActiveSprint(userId, localDate);

    if (sprintOpt.isEmpty()) {
      return SprintWidget.empty();
    }

    TodaySprintSummary summary = sprintOpt.get();
    SprintData data =
        new SprintData(
            summary.sprintId(),
            summary.name(),
            summary.completedStoryPoints(),
            summary.totalStoryPoints(),
            summary.startDate(),
            summary.endDate());

    return SprintWidget.success(data);
  }
}
