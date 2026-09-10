package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort.TodayProjectSummary;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTodayPort;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTodayPort.TodayTimeBlockRecord;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.CurrentNextBlockData;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.CurrentNextBlockWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.TimeBlockDto;
import tech.buildwithpartha.lifeos.report.application.provider.CurrentNextBlockWidgetProvider;

/** Real-data provider for the Today current/next time block widget (LOS-1415). */
@Component
public class DefaultCurrentNextBlockWidgetProvider implements CurrentNextBlockWidgetProvider {

  private final TimeBlockTodayPort timeBlockTodayPort;
  private final ProjectTodayPort projectTodayPort;
  private final Clock clock;

  public DefaultCurrentNextBlockWidgetProvider(
      TimeBlockTodayPort timeBlockTodayPort, ProjectTodayPort projectTodayPort, Clock clock) {
    this.timeBlockTodayPort =
        Objects.requireNonNull(timeBlockTodayPort, "timeBlockTodayPort must not be null");
    this.projectTodayPort =
        Objects.requireNonNull(projectTodayPort, "projectTodayPort must not be null");
    this.clock = Objects.requireNonNull(clock, "clock must not be null");
  }

  @Override
  public CurrentNextBlockWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    Instant now = clock.instant();
    Instant rangeStart = localDate.atStartOfDay(zoneId).toInstant();
    Instant rangeEnd = localDate.plusDays(1).atStartOfDay(zoneId).toInstant();

    List<TodayTimeBlockRecord> records =
        timeBlockTodayPort.getTodayTimeBlocks(userId, rangeStart, rangeEnd, zoneId);

    TodayTimeBlockRecord currentRecord =
        records.stream()
            .filter(b -> !now.isBefore(b.startAt()) && now.isBefore(b.endAt()))
            .findFirst()
            .orElse(null);

    TodayTimeBlockRecord nextRecord =
        records.stream().filter(b -> b.startAt().isAfter(now)).findFirst().orElse(null);

    if (currentRecord == null && nextRecord == null) {
      return CurrentNextBlockWidget.empty();
    }

    Map<UUID, TodayProjectSummary> projectMap = projectTodayPort.getProjectSummaries(userId);

    TimeBlockDto currentDto = currentRecord != null ? toDto(currentRecord, projectMap) : null;
    TimeBlockDto nextDto = nextRecord != null ? toDto(nextRecord, projectMap) : null;

    return CurrentNextBlockWidget.success(new CurrentNextBlockData(currentDto, nextDto));
  }

  private static TimeBlockDto toDto(
      TodayTimeBlockRecord record, Map<UUID, TodayProjectSummary> projectMap) {
    TodayProjectSummary project = record.projectId().map(projectMap::get).orElse(null);
    String projectName = project != null ? project.name() : null;
    return new TimeBlockDto(
        record.id(),
        record.title(),
        record.startTime(),
        record.endTime(),
        record.category(),
        record.projectId().orElse(null),
        projectName,
        record.completed());
  }
}
