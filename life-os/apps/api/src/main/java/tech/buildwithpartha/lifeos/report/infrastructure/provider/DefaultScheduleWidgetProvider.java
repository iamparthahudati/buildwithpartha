package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort.TodayProjectSummary;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTodayPort;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTodayPort.TodayTimeBlockRecord;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ScheduleConflictDto;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ScheduleData;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ScheduleWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.TimeBlockDto;
import tech.buildwithpartha.lifeos.report.application.provider.ScheduleWidgetProvider;

/** Real-data provider for the Today schedule widget with overlap conflict detection (LOS-1415). */
@Component
public class DefaultScheduleWidgetProvider implements ScheduleWidgetProvider {

  private final TimeBlockTodayPort timeBlockTodayPort;
  private final ProjectTodayPort projectTodayPort;

  public DefaultScheduleWidgetProvider(
      TimeBlockTodayPort timeBlockTodayPort, ProjectTodayPort projectTodayPort) {
    this.timeBlockTodayPort =
        Objects.requireNonNull(timeBlockTodayPort, "timeBlockTodayPort must not be null");
    this.projectTodayPort =
        Objects.requireNonNull(projectTodayPort, "projectTodayPort must not be null");
  }

  @Override
  public ScheduleWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    Instant rangeStart = localDate.atStartOfDay(zoneId).toInstant();
    Instant rangeEnd = localDate.plusDays(1).atStartOfDay(zoneId).toInstant();

    List<TodayTimeBlockRecord> records =
        timeBlockTodayPort.getTodayTimeBlocks(userId, rangeStart, rangeEnd, zoneId);

    if (records.isEmpty()) {
      return ScheduleWidget.empty();
    }

    Map<UUID, TodayProjectSummary> projectMap = projectTodayPort.getProjectSummaries(userId);

    List<TimeBlockDto> blocks =
        records.stream()
            .map(
                b -> {
                  TodayProjectSummary project = b.projectId().map(projectMap::get).orElse(null);
                  String projectName = project != null ? project.name() : null;
                  return new TimeBlockDto(
                      b.id(),
                      b.title(),
                      b.startTime(),
                      b.endTime(),
                      b.category(),
                      b.projectId().orElse(null),
                      projectName,
                      b.completed());
                })
            .toList();

    List<ScheduleConflictDto> conflicts = new ArrayList<>();
    for (int i = 0; i < records.size(); i++) {
      TodayTimeBlockRecord first = records.get(i);
      for (int j = i + 1; j < records.size(); j++) {
        TodayTimeBlockRecord second = records.get(j);
        if (first.startAt().isBefore(second.endAt()) && second.startAt().isBefore(first.endAt())) {
          conflicts.add(
              new ScheduleConflictDto(
                  first.id(),
                  second.id(),
                  "Time blocks overlap: " + first.title() + " and " + second.title()));
        }
      }
    }

    return ScheduleWidget.success(new ScheduleData(blocks, conflicts));
  }
}
