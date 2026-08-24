package tech.buildwithpartha.lifeos.focus.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionPhase;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionStatus;

/** JPA mapping for {@code public.focus_sessions}. */
@Entity
@Table(name = "focus_sessions", schema = "public")
class FocusSessionEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "task_id")
  private UUID taskId;

  @Column(name = "time_block_id")
  private UUID timeBlockId;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private FocusSessionStatus status;

  @Enumerated(EnumType.STRING)
  @Column(name = "phase", nullable = false)
  private FocusSessionPhase phase;

  @Column(name = "planned_focus_duration_seconds", nullable = false)
  private long plannedFocusDurationSeconds;

  @Column(name = "planned_break_duration_seconds", nullable = false)
  private long plannedBreakDurationSeconds;

  @Column(name = "actual_focus_duration_seconds", nullable = false)
  private long actualFocusDurationSeconds;

  @Column(name = "actual_break_duration_seconds", nullable = false)
  private long actualBreakDurationSeconds;

  @Column(name = "started_at", nullable = false, updatable = false)
  private Instant startedAt;

  @Column(name = "phase_started_at")
  private Instant phaseStartedAt;

  @Column(name = "paused_at")
  private Instant pausedAt;

  @Column(name = "ended_at")
  private Instant endedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected FocusSessionEntity() {}

  private FocusSessionEntity(FocusSession session) {
    id = session.id();
    userId = session.userId();
    taskId = session.taskId().orElse(null);
    timeBlockId = session.timeBlockId().orElse(null);
    status = session.status();
    phase = session.phase();
    plannedFocusDurationSeconds = session.plannedFocusDuration().toSeconds();
    plannedBreakDurationSeconds = session.plannedBreakDuration().toSeconds();
    actualFocusDurationSeconds = session.actualFocusDuration().toSeconds();
    actualBreakDurationSeconds = session.actualBreakDuration().toSeconds();
    startedAt = session.startedAt();
    phaseStartedAt = session.phaseStartedAt().orElse(null);
    pausedAt = session.pausedAt().orElse(null);
    endedAt = session.endedAt().orElse(null);
    createdAt = session.createdAt();
    updatedAt = session.updatedAt();
    version = session.version();
  }

  static FocusSessionEntity fromDomain(FocusSession session) {
    return new FocusSessionEntity(session);
  }

  FocusSession toDomain() {
    return new FocusSession(
        id,
        userId,
        Optional.ofNullable(taskId),
        Optional.ofNullable(timeBlockId),
        status,
        phase,
        Duration.ofSeconds(plannedFocusDurationSeconds),
        Duration.ofSeconds(plannedBreakDurationSeconds),
        Duration.ofSeconds(actualFocusDurationSeconds),
        Duration.ofSeconds(actualBreakDurationSeconds),
        startedAt,
        Optional.ofNullable(phaseStartedAt),
        Optional.ofNullable(pausedAt),
        Optional.ofNullable(endedAt),
        createdAt,
        updatedAt,
        version);
  }
}
