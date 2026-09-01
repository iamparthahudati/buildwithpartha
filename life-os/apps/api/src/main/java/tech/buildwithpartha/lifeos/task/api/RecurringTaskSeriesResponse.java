package tech.buildwithpartha.lifeos.task.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceEndMode;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceFrequency;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeries;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

/** Response DTO representing a recurring task series. */
public record RecurringTaskSeriesResponse(
    UUID id,
    UUID userId,
    String title,
    String description,
    TaskStatus status,
    TaskPriority priority,
    UUID projectId,
    int estimateMinutes,
    RecurrenceFrequency frequency,
    int intervalValue,
    String daysOfWeek,
    Integer dayOfMonth,
    RecurrenceEndMode endMode,
    LocalDate endDate,
    Integer endCount,
    LocalDate startDate,
    String timeZone,
    Instant archivedAt,
    Instant deletedAt,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static RecurringTaskSeriesResponse fromDomain(RecurringTaskSeries series) {
    return new RecurringTaskSeriesResponse(
        series.id(),
        series.userId(),
        series.title(),
        series.description().orElse(null),
        series.status(),
        series.priority(),
        series.projectId().orElse(null),
        series.estimateMinutes(),
        series.frequency(),
        series.intervalValue(),
        series.daysOfWeek().orElse(null),
        series.dayOfMonth().orElse(null),
        series.endMode(),
        series.endDate().orElse(null),
        series.endCount().orElse(null),
        series.startDate(),
        series.timeZone(),
        series.archivedAt().orElse(null),
        series.deletedAt().orElse(null),
        series.createdAt(),
        series.updatedAt(),
        series.version());
  }
}
