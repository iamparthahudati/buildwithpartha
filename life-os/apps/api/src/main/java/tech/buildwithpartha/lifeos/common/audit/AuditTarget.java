package tech.buildwithpartha.lifeos.common.audit;

import java.util.Objects;
import java.util.UUID;

/** Optional typed target for one Security Audit Event. */
public record AuditTarget(AuditTargetType type, UUID id) {
  public AuditTarget {
    Objects.requireNonNull(type, "type must not be null");
    Objects.requireNonNull(id, "id must not be null");
  }
}
