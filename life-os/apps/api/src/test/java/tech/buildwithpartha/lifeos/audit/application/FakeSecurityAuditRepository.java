package tech.buildwithpartha.lifeos.audit.application;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import tech.buildwithpartha.lifeos.audit.domain.SecurityAuditEvent;
import tech.buildwithpartha.lifeos.audit.domain.SecurityAuditRepository;

final class FakeSecurityAuditRepository implements SecurityAuditRepository {

  final List<SecurityAuditEvent> events = new ArrayList<>();

  @Override
  public SecurityAuditEvent save(SecurityAuditEvent event) {
    events.add(event);
    return event;
  }

  @Override
  public int deleteExpiredBefore(Instant cutoff) {
    int before = events.size();
    events.removeIf(event -> !event.expiresAt().isAfter(cutoff));
    return before - events.size();
  }
}
