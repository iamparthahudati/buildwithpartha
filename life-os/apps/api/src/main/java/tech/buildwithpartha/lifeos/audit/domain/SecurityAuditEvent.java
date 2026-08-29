package tech.buildwithpartha.lifeos.audit.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import tech.buildwithpartha.lifeos.common.audit.AuditOutcome;
import tech.buildwithpartha.lifeos.common.audit.AuditTarget;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditEventType;

/** Immutable restricted Security Audit Event retained under privacy class R6. */
public record SecurityAuditEvent(
    UUID id,
    SecurityAuditEventType eventType,
    AuditOutcome outcome,
    Optional<UUID> actorUserId,
    Optional<UUID> subjectUserId,
    Optional<AuditTarget> target,
    String correlationId,
    Instant occurredAt,
    Instant expiresAt) {

  private static final Pattern SAFE_CORRELATION_ID =
      Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,63}");

  public SecurityAuditEvent {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(eventType, "eventType must not be null");
    Objects.requireNonNull(outcome, "outcome must not be null");
    actorUserId = Objects.requireNonNull(actorUserId, "actorUserId must not be null");
    subjectUserId = Objects.requireNonNull(subjectUserId, "subjectUserId must not be null");
    target = Objects.requireNonNull(target, "target must not be null");
    Objects.requireNonNull(correlationId, "correlationId must not be null");
    Objects.requireNonNull(occurredAt, "occurredAt must not be null");
    Objects.requireNonNull(expiresAt, "expiresAt must not be null");
    if (!SAFE_CORRELATION_ID.matcher(correlationId).matches()) {
      throw new IllegalArgumentException("correlationId must use the safe correlation format");
    }
    if (!expiresAt.isAfter(occurredAt)) {
      throw new IllegalArgumentException("expiresAt must be after occurredAt");
    }
  }
}
