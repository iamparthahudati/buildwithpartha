package tech.buildwithpartha.lifeos.job.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobStatus;

/**
 * JPA row for {@code public.background_jobs} ({@code V5__background_jobs_schema.sql}). The id is
 * application-assigned; the column default is a safety net. Translated to and from the immutable
 * {@code job.domain.BackgroundJob} aggregate by {@link JpaBackgroundJobRepository}.
 */
@Entity
@Table(name = "background_jobs", schema = "public")
class BackgroundJobEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id")
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "job_kind", nullable = false, updatable = false)
  private BackgroundJobKind jobKind;

  @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
  private String payload;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private BackgroundJobStatus status;

  @Column(name = "attempt_count", nullable = false)
  private int attemptCount;

  @Column(name = "next_attempt_at", nullable = false)
  private Instant nextAttemptAt;

  @Column(name = "last_attempt_at")
  private Instant lastAttemptAt;

  @Column(name = "last_error_class")
  private String lastErrorClass;

  @Column(name = "started_at")
  private Instant startedAt;

  @Column(name = "completed_at")
  private Instant completedAt;

  @Column(name = "dead_lettered_at")
  private Instant deadLetteredAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected BackgroundJobEntity() {}

  BackgroundJobEntity(
      UUID id,
      UUID userId,
      BackgroundJobKind jobKind,
      String payload,
      BackgroundJobStatus status,
      int attemptCount,
      Instant nextAttemptAt,
      Instant lastAttemptAt,
      String lastErrorClass,
      Instant startedAt,
      Instant completedAt,
      Instant deadLetteredAt,
      Instant createdAt,
      Instant updatedAt) {
    this.id = id;
    this.userId = userId;
    this.jobKind = jobKind;
    this.payload = payload;
    this.status = status;
    this.attemptCount = attemptCount;
    this.nextAttemptAt = nextAttemptAt;
    this.lastAttemptAt = lastAttemptAt;
    this.lastErrorClass = lastErrorClass;
    this.startedAt = startedAt;
    this.completedAt = completedAt;
    this.deadLetteredAt = deadLetteredAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  BackgroundJobKind getJobKind() {
    return jobKind;
  }

  String getPayload() {
    return payload;
  }

  BackgroundJobStatus getStatus() {
    return status;
  }

  int getAttemptCount() {
    return attemptCount;
  }

  Instant getNextAttemptAt() {
    return nextAttemptAt;
  }

  Instant getLastAttemptAt() {
    return lastAttemptAt;
  }

  String getLastErrorClass() {
    return lastErrorClass;
  }

  Instant getStartedAt() {
    return startedAt;
  }

  Instant getCompletedAt() {
    return completedAt;
  }

  Instant getDeadLetteredAt() {
    return deadLetteredAt;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getUpdatedAt() {
    return updatedAt;
  }
}
