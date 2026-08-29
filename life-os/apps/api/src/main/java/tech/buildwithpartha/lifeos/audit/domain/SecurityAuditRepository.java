package tech.buildwithpartha.lifeos.audit.domain;

import java.time.Instant;

/** Restricted persistence boundary for Security Audit Events. */
public interface SecurityAuditRepository {

  SecurityAuditEvent save(SecurityAuditEvent event);

  int deleteExpiredBefore(Instant cutoff);
}
