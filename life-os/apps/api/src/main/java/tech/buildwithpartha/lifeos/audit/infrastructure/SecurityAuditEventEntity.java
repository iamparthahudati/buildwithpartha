package tech.buildwithpartha.lifeos.audit.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.audit.AuditOutcome;
import tech.buildwithpartha.lifeos.common.audit.AuditTargetType;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditEventType;

/** Restricted JPA row for {@code public.security_audit_events}. */
@Entity
@Table(name = "security_audit_events", schema = "public")
class SecurityAuditEventEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Enumerated(EnumType.STRING)
  @Column(name = "event_type", nullable = false, updatable = false)
  private SecurityAuditEventType eventType;

  @Enumerated(EnumType.STRING)
  @Column(name = "outcome", nullable = false, updatable = false)
  private AuditOutcome outcome;

  @Column(name = "actor_user_id", updatable = false)
  private UUID actorUserId;

  @Column(name = "subject_user_id", updatable = false)
  private UUID subjectUserId;

  @Enumerated(EnumType.STRING)
  @Column(name = "target_type", updatable = false)
  private AuditTargetType targetType;

  @Column(name = "target_id", updatable = false)
  private UUID targetId;

  @Column(name = "correlation_id", nullable = false, updatable = false, length = 64)
  private String correlationId;

  @Column(name = "occurred_at", nullable = false, updatable = false)
  private Instant occurredAt;

  @Column(name = "expires_at", nullable = false, updatable = false)
  private Instant expiresAt;

  protected SecurityAuditEventEntity() {}

  SecurityAuditEventEntity(
      UUID id,
      SecurityAuditEventType eventType,
      AuditOutcome outcome,
      UUID actorUserId,
      UUID subjectUserId,
      AuditTargetType targetType,
      UUID targetId,
      String correlationId,
      Instant occurredAt,
      Instant expiresAt) {
    this.id = id;
    this.eventType = eventType;
    this.outcome = outcome;
    this.actorUserId = actorUserId;
    this.subjectUserId = subjectUserId;
    this.targetType = targetType;
    this.targetId = targetId;
    this.correlationId = correlationId;
    this.occurredAt = occurredAt;
    this.expiresAt = expiresAt;
  }

  UUID getId() {
    return id;
  }

  SecurityAuditEventType getEventType() {
    return eventType;
  }

  AuditOutcome getOutcome() {
    return outcome;
  }

  UUID getActorUserId() {
    return actorUserId;
  }

  UUID getSubjectUserId() {
    return subjectUserId;
  }

  AuditTargetType getTargetType() {
    return targetType;
  }

  UUID getTargetId() {
    return targetId;
  }

  String getCorrelationId() {
    return correlationId;
  }

  Instant getOccurredAt() {
    return occurredAt;
  }

  Instant getExpiresAt() {
    return expiresAt;
  }
}
