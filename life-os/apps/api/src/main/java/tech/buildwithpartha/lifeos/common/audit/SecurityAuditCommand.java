package tech.buildwithpartha.lifeos.common.audit;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Content-free command for a restricted Security Audit Event.
 *
 * <p>No String, byte array, collection, or map field is accepted, so callers cannot include
 * credentials, tokens, cookies, request bodies, titles, or comment content.
 */
public record SecurityAuditCommand(
    SecurityAuditEventType eventType,
    AuditOutcome outcome,
    Optional<UUID> actorUserId,
    Optional<UUID> subjectUserId,
    Optional<AuditTarget> target) {

  public SecurityAuditCommand {
    Objects.requireNonNull(eventType, "eventType must not be null");
    Objects.requireNonNull(outcome, "outcome must not be null");
    actorUserId = Objects.requireNonNull(actorUserId, "actorUserId must not be null");
    subjectUserId = Objects.requireNonNull(subjectUserId, "subjectUserId must not be null");
    target = Objects.requireNonNull(target, "target must not be null");
  }
}
