package tech.buildwithpartha.lifeos.task.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceEndMode;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceFrequency;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

/** JPA entity mapping to {@code public.recurring_task_series}. */
@Entity
@Table(name = "recurring_task_series", schema = "public")
class RecurringTaskSeriesEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "title", nullable = false)
  private String title;

  @Column(name = "description")
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private TaskStatus status;

  @Enumerated(EnumType.STRING)
  @Column(name = "priority", nullable = false)
  private TaskPriority priority;

  @Column(name = "project_id")
  private UUID projectId;

  @Column(name = "estimate_minutes", nullable = false)
  private int estimateMinutes;

  @Enumerated(EnumType.STRING)
  @Column(name = "frequency", nullable = false)
  private RecurrenceFrequency frequency;

  @Column(name = "interval_value", nullable = false)
  private int intervalValue;

  @Column(name = "days_of_week")
  private String daysOfWeek;

  @Column(name = "day_of_month")
  private Integer dayOfMonth;

  @Enumerated(EnumType.STRING)
  @Column(name = "end_mode", nullable = false)
  private RecurrenceEndMode endMode;

  @Column(name = "end_date")
  private LocalDate endDate;

  @Column(name = "end_count")
  private Integer endCount;

  @Column(name = "start_date", nullable = false)
  private LocalDate startDate;

  @Column(name = "time_zone", nullable = false)
  private String timeZone;

  @Column(name = "archived_at")
  private Instant archivedAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected RecurringTaskSeriesEntity() {}

  RecurringTaskSeriesEntity(
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
    this.id = id;
    this.userId = userId;
    this.title = title;
    this.description = description;
    this.status = status;
    this.priority = priority;
    this.projectId = projectId;
    this.estimateMinutes = estimateMinutes;
    this.frequency = frequency;
    this.intervalValue = intervalValue;
    this.daysOfWeek = daysOfWeek;
    this.dayOfMonth = dayOfMonth;
    this.endMode = endMode;
    this.endDate = endDate;
    this.endCount = endCount;
    this.startDate = startDate;
    this.timeZone = timeZone;
    this.archivedAt = archivedAt;
    this.deletedAt = deletedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  String getTitle() {
    return title;
  }

  String getDescription() {
    return description;
  }

  TaskStatus getStatus() {
    return status;
  }

  TaskPriority getPriority() {
    return priority;
  }

  UUID getProjectId() {
    return projectId;
  }

  int getEstimateMinutes() {
    return estimateMinutes;
  }

  RecurrenceFrequency getFrequency() {
    return frequency;
  }

  int getIntervalValue() {
    return intervalValue;
  }

  String getDaysOfWeek() {
    return daysOfWeek;
  }

  Integer getDayOfMonth() {
    return dayOfMonth;
  }

  RecurrenceEndMode getEndMode() {
    return endMode;
  }

  LocalDate getEndDate() {
    return endDate;
  }

  Integer getEndCount() {
    return endCount;
  }

  LocalDate getStartDate() {
    return startDate;
  }

  String getTimeZone() {
    return timeZone;
  }

  Instant getArchivedAt() {
    return archivedAt;
  }

  Instant getDeletedAt() {
    return deletedAt;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getUpdatedAt() {
    return updatedAt;
  }

  long getVersion() {
    return version;
  }
}
