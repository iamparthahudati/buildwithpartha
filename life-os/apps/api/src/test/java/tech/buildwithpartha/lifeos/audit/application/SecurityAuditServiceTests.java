package tech.buildwithpartha.lifeos.audit.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import tech.buildwithpartha.lifeos.common.audit.AuditOutcome;
import tech.buildwithpartha.lifeos.common.audit.AuditTarget;
import tech.buildwithpartha.lifeos.common.audit.AuditTargetType;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditCommand;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditEventType;

class SecurityAuditServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-23T11:00:00Z");

  @AfterEach
  void clearMdc() {
    MDC.clear();
  }

  @Test
  void recordsRestrictedEventWithExplicitR6Expiry() {
    FakeSecurityAuditRepository repository = new FakeSecurityAuditRepository();
    SecurityAuditService service =
        new SecurityAuditService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    MDC.put("correlationId", "request.audit-1");

    service.record(
        new SecurityAuditCommand(
            SecurityAuditEventType.RECORD_DELETED,
            AuditOutcome.SUCCEEDED,
            Optional.of(userId),
            Optional.of(userId),
            Optional.of(new AuditTarget(AuditTargetType.TASK, taskId))));

    assertThat(repository.events)
        .singleElement()
        .satisfies(
            event -> {
              assertThat(event.actorUserId()).contains(userId);
              assertThat(event.target()).contains(new AuditTarget(AuditTargetType.TASK, taskId));
              assertThat(event.correlationId()).isEqualTo("request.audit-1");
              assertThat(event.occurredAt()).isEqualTo(NOW);
              assertThat(event.expiresAt()).isEqualTo(NOW.plus(SecurityAuditService.RETENTION));
            });
  }

  @Test
  void cleanupDeletesOnlyExpiredEvents() {
    FakeSecurityAuditRepository repository = new FakeSecurityAuditRepository();
    SecurityAuditService oldService =
        new SecurityAuditService(
            repository, Clock.fixed(NOW.minus(SecurityAuditService.RETENTION), ZoneOffset.UTC));
    oldService.record(command());
    SecurityAuditService currentService =
        new SecurityAuditService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    currentService.record(command());

    int deleted = currentService.purgeExpired();

    assertThat(deleted).isOne();
    assertThat(repository.events).hasSize(1);
    assertThat(repository.events.getFirst().occurredAt()).isEqualTo(NOW);
  }

  @Test
  void scheduledCleanupDelegatesToRetentionService() {
    FakeSecurityAuditRepository repository = new FakeSecurityAuditRepository();
    SecurityAuditService service =
        new SecurityAuditService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    new SecurityAuditRetentionJob(service).purgeExpiredEvents();

    assertThat(repository.events).isEmpty();
  }

  private static SecurityAuditCommand command() {
    return new SecurityAuditCommand(
        SecurityAuditEventType.SIGN_IN,
        AuditOutcome.SUCCEEDED,
        Optional.empty(),
        Optional.empty(),
        Optional.empty());
  }
}
