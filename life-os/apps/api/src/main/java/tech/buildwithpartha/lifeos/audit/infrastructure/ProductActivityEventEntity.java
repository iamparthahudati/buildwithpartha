package tech.buildwithpartha.lifeos.audit.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;

/** JPA row for {@code public.product_activity_events}. */
@Entity
@Table(name = "product_activity_events", schema = "public")
class ProductActivityEventEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "actor_user_id", nullable = false, updatable = false)
  private UUID actorUserId;

  @Enumerated(EnumType.STRING)
  @Column(name = "event_type", nullable = false, updatable = false)
  private ActivityEventType eventType;

  @Enumerated(EnumType.STRING)
  @Column(name = "subject_type", nullable = false, updatable = false)
  private ActivitySubjectType subjectType;

  @Column(name = "subject_id", nullable = false, updatable = false)
  private UUID subjectId;

  @Column(name = "correlation_id", nullable = false, updatable = false, length = 64)
  private String correlationId;

  @Column(name = "occurred_at", nullable = false, updatable = false)
  private Instant occurredAt;

  protected ProductActivityEventEntity() {}

  ProductActivityEventEntity(
      UUID id,
      UUID userId,
      UUID actorUserId,
      ActivityEventType eventType,
      ActivitySubjectType subjectType,
      UUID subjectId,
      String correlationId,
      Instant occurredAt) {
    this.id = id;
    this.userId = userId;
    this.actorUserId = actorUserId;
    this.eventType = eventType;
    this.subjectType = subjectType;
    this.subjectId = subjectId;
    this.correlationId = correlationId;
    this.occurredAt = occurredAt;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  UUID getActorUserId() {
    return actorUserId;
  }

  ActivityEventType getEventType() {
    return eventType;
  }

  ActivitySubjectType getSubjectType() {
    return subjectType;
  }

  UUID getSubjectId() {
    return subjectId;
  }

  String getCorrelationId() {
    return correlationId;
  }

  Instant getOccurredAt() {
    return occurredAt;
  }
}
