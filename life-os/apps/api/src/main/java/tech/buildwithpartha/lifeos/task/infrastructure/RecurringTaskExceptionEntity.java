package tech.buildwithpartha.lifeos.task.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceExceptionType;

/** JPA entity mapping to {@code public.recurring_task_exceptions}. */
@Entity
@Table(name = "recurring_task_exceptions", schema = "public")
class RecurringTaskExceptionEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "series_id", nullable = false, updatable = false)
  private UUID seriesId;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "occurrence_date", nullable = false, updatable = false)
  private LocalDate occurrenceDate;

  @Enumerated(EnumType.STRING)
  @Column(name = "exception_type", nullable = false)
  private RecurrenceExceptionType exceptionType;

  @Column(name = "rescheduled_date")
  private LocalDate rescheduledDate;

  @Column(name = "override_task_id")
  private UUID overrideTaskId;

  @Column(name = "reason")
  private String reason;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected RecurringTaskExceptionEntity() {}

  RecurringTaskExceptionEntity(
      UUID id,
      UUID seriesId,
      UUID userId,
      LocalDate occurrenceDate,
      RecurrenceExceptionType exceptionType,
      LocalDate rescheduledDate,
      UUID overrideTaskId,
      String reason,
      Instant createdAt) {
    this.id = id;
    this.seriesId = seriesId;
    this.userId = userId;
    this.occurrenceDate = occurrenceDate;
    this.exceptionType = exceptionType;
    this.rescheduledDate = rescheduledDate;
    this.overrideTaskId = overrideTaskId;
    this.reason = reason;
    this.createdAt = createdAt;
  }

  UUID getId() {
    return id;
  }

  UUID getSeriesId() {
    return seriesId;
  }

  UUID getUserId() {
    return userId;
  }

  LocalDate getOccurrenceDate() {
    return occurrenceDate;
  }

  RecurrenceExceptionType getExceptionType() {
    return exceptionType;
  }

  LocalDate getRescheduledDate() {
    return rescheduledDate;
  }

  UUID getOverrideTaskId() {
    return overrideTaskId;
  }

  String getReason() {
    return reason;
  }

  Instant getCreatedAt() {
    return createdAt;
  }
}
