package tech.buildwithpartha.lifeos.common.audit;

/** Cross-domain write-only boundary for restricted Security Audit Events. */
public interface SecurityAuditPort {
  void record(SecurityAuditCommand command);
}
