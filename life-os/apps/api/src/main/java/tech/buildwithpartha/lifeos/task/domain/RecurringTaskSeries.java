package tech.buildwithpartha.lifeos.task.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Immutable domain record representing a Recurring Task Series aggregate with invariants. */
public record RecurringTaskSeries(
    UUID id,
    UUID userId,
    String title,
    Optional<String> description,
    TaskStatus status,
    TaskPriority priority,
    Optional<UUID> projectId,
    int estimateMinutes,
    RecurrenceFrequency frequency,
    int intervalValue,
    Optional<String> daysOfWeek,
    Optional<Integer> dayOfMonth,
    RecurrenceEndMode endMode,
    Optional<LocalDate> endDate,
    Optional<Integer> endCount,
    LocalDate startDate,
    String timeZone,
    Optional<Instant> archivedAt,
    Optional<Instant> deletedAt,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public RecurringTaskSeries {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(description, "description must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(priority, "priority must not be null");
    Objects.requireNonNull(projectId, "projectId must not be null");
    Objects.requireNonNull(frequency, "frequency must not be null");
    Objects.requireNonNull(daysOfWeek, "daysOfWeek must not be null");
    Objects.requireNonNull(dayOfMonth, "dayOfMonth must not be null");
    Objects.requireNonNull(endMode, "endMode must not be null");
    Objects.requireNonNull(endDate, "endDate must not be null");
    Objects.requireNonNull(endCount, "endCount must not be null");
    Objects.requireNonNull(startDate, "startDate must not be null");
    Objects.requireNonNull(timeZone, "timeZone must not be null");
    Objects.requireNonNull(archivedAt, "archivedAt must not be null");
    Objects.requireNonNull(deletedAt, "deletedAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");

    if (title.isBlank()) {
      throw new IllegalArgumentException("Recurring task series title must not be blank");
    }
    if (estimateMinutes < 0) {
      throw new IllegalArgumentException("Estimate minutes must not be negative");
    }
    if (intervalValue < 1) {
      throw new IllegalArgumentException("Interval value must be at least 1");
    }
    if (timeZone.isBlank()) {
      throw new IllegalArgumentException("Time zone must not be blank");
    }
    try {
      ZoneId.of(timeZone);
    } catch (Exception e) {
      throw new IllegalArgumentException("Invalid time zone: " + timeZone, e);
    }
    if (endMode == RecurrenceEndMode.UNTIL_DATE && endDate.isEmpty()) {
      throw new IllegalArgumentException("endDate must be provided when endMode is UNTIL_DATE");
    }
    if (endMode == RecurrenceEndMode.COUNT) {
      if (endCount.isEmpty() || endCount.get() < 1) {
        throw new IllegalArgumentException("endCount must be at least 1 when endMode is COUNT");
      }
    }
  }

  public RecurringTaskSeries(
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
    this(
        id,
        userId,
        title,
        Optional.ofNullable(description),
        status,
        priority,
        Optional.ofNullable(projectId),
        estimateMinutes,
        frequency,
        intervalValue,
        Optional.ofNullable(daysOfWeek),
        Optional.ofNullable(dayOfMonth),
        endMode,
        Optional.ofNullable(endDate),
        Optional.ofNullable(endCount),
        startDate,
        timeZone,
        Optional.ofNullable(archivedAt),
        Optional.ofNullable(deletedAt),
        createdAt,
        updatedAt,
        version);
  }
}
