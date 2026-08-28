package tech.buildwithpartha.lifeos.audit.infrastructure;

import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.audit.domain.SecurityAuditEvent;
import tech.buildwithpartha.lifeos.audit.domain.SecurityAuditRepository;
import tech.buildwithpartha.lifeos.common.audit.AuditTarget;

@Component
class JpaSecurityAuditRepository implements SecurityAuditRepository {

  private final SecurityAuditEventJpaRepository jpa;

  JpaSecurityAuditRepository(SecurityAuditEventJpaRepository jpa) {
    this.jpa = jpa;
  }

  @Override
  public SecurityAuditEvent save(SecurityAuditEvent event) {
    AuditTarget target = event.target().orElse(null);
    SecurityAuditEventEntity saved =
        jpa.save(
            new SecurityAuditEventEntity(
                event.id(),
                event.eventType(),
                event.outcome(),
                event.actorUserId().orElse(null),
                event.subjectUserId().orElse(null),
                target == null ? null : target.type(),
                target == null ? null : target.id(),
                event.correlationId(),
                event.occurredAt(),
                event.expiresAt()));
    Optional<AuditTarget> savedTarget =
        saved.getTargetType() == null
            ? Optional.empty()
            : Optional.of(new AuditTarget(saved.getTargetType(), saved.getTargetId()));
    return new SecurityAuditEvent(
        saved.getId(),
        saved.getEventType(),
        saved.getOutcome(),
        Optional.ofNullable(saved.getActorUserId()),
        Optional.ofNullable(saved.getSubjectUserId()),
        savedTarget,
        saved.getCorrelationId(),
        saved.getOccurredAt(),
        saved.getExpiresAt());
  }

  @Override
  public int deleteExpiredBefore(Instant cutoff) {
    return jpa.deleteExpiredBefore(cutoff);
  }
}
