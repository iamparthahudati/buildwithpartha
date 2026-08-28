package tech.buildwithpartha.lifeos.sprint.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.domain.SprintEventType;

@Entity
@Table(name = "sprint_events", schema = "public")
class SprintEventEntity {
  @Id private UUID id;

  @Column(name = "sprint_id", nullable = false)
  private UUID sprintId;

  @Enumerated(EnumType.STRING)
  @Column(name = "event_type", nullable = false)
  private SprintEventType eventType;

  @Column(name = "task_id")
  private UUID taskId;

  @Column(name = "points_delta")
  private Integer pointsDelta;

  private String reason;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  protected SprintEventEntity() {}

  SprintEventEntity(
      UUID id,
      UUID sprintId,
      SprintEventType eventType,
      UUID taskId,
      Integer pointsDelta,
      String reason,
      Instant occurredAt) {
    this.id = id;
    this.sprintId = sprintId;
    this.eventType = eventType;
    this.taskId = taskId;
    this.pointsDelta = pointsDelta;
    this.reason = reason;
    this.occurredAt = occurredAt;
  }

  UUID getId() {
    return id;
  }

  SprintEventType getEventType() {
    return eventType;
  }

  UUID getTaskId() {
    return taskId;
  }

  Integer getPointsDelta() {
    return pointsDelta;
  }

  String getReason() {
    return reason;
  }

  Instant getOccurredAt() {
    return occurredAt;
  }
}
