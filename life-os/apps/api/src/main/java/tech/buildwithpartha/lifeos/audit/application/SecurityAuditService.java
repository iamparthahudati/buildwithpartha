package tech.buildwithpartha.lifeos.audit.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.audit.domain.SecurityAuditEvent;
import tech.buildwithpartha.lifeos.audit.domain.SecurityAuditRepository;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditCommand;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditPort;

/** Write-only cross-domain Security Audit Event service. */
@Service
public class SecurityAuditService implements SecurityAuditPort {

  static final Duration RETENTION = Duration.ofDays(365);

  private final SecurityAuditRepository repository;
  private final Clock clock;

  public SecurityAuditService(SecurityAuditRepository repository, Clock clock) {
    this.repository = repository;
    this.clock = clock;
  }

  @Override
  @Transactional
  public void record(SecurityAuditCommand command) {
    Objects.requireNonNull(command, "command must not be null");
    Instant occurredAt = clock.instant();
    repository.save(
        new SecurityAuditEvent(
            UUID.randomUUID(),
            command.eventType(),
            command.outcome(),
            command.actorUserId(),
            command.subjectUserId(),
            command.target(),
            EventCorrelationIds.current(),
            occurredAt,
            occurredAt.plus(RETENTION)));
  }

  @Transactional
  public int purgeExpired() {
    return repository.deleteExpiredBefore(clock.instant());
  }
}
