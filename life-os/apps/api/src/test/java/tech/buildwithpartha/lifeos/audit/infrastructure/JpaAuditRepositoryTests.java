package tech.buildwithpartha.lifeos.audit.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.audit.domain.ProductActivityEvent;
import tech.buildwithpartha.lifeos.audit.domain.SecurityAuditEvent;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.audit.AuditOutcome;
import tech.buildwithpartha.lifeos.common.audit.AuditTarget;
import tech.buildwithpartha.lifeos.common.audit.AuditTargetType;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditEventType;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaAuditRepositoryTests {

  @Autowired private ProductActivityEventJpaRepository activityJpa;
  @Autowired private SecurityAuditEventJpaRepository auditJpa;

  @Test
  void activityRoundTripsAndQueriesRemainUserScoped() {
    JpaProductActivityRepository repository = new JpaProductActivityRepository(activityJpa);
    UUID owner = UUID.randomUUID();
    UUID otherUser = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-23T12:00:00Z");
    repository.save(activity(owner, taskId, ActivityEventType.COMMENT_CREATED, now));
    repository.save(activity(owner, taskId, ActivityEventType.COMMENT_UPDATED, now.plusSeconds(1)));
    repository.save(
        activity(otherUser, taskId, ActivityEventType.COMMENT_DELETED, now.plusSeconds(2)));
    activityJpa.flush();

    var ownerEvents = repository.findBySubject(owner, ActivitySubjectType.TASK, taskId, 0, 10);

    assertThat(ownerEvents)
        .extracting(ProductActivityEvent::eventType)
        .containsExactly(ActivityEventType.COMMENT_UPDATED, ActivityEventType.COMMENT_CREATED);
    assertThat(repository.countBySubject(owner, ActivitySubjectType.TASK, taskId)).isEqualTo(2);
    assertThat(repository.countBySubject(otherUser, ActivitySubjectType.TASK, taskId)).isOne();
  }

  @Test
  void securityAuditRoundTripsTargetAndPurgesOnlyExpiredRows() {
    JpaSecurityAuditRepository repository = new JpaSecurityAuditRepository(auditJpa);
    Instant now = Instant.parse("2026-08-23T12:00:00Z");
    UUID userId = UUID.randomUUID();
    SecurityAuditEvent expired = audit(userId, now.minusSeconds(2), now.minusSeconds(1));
    SecurityAuditEvent retained = audit(userId, now, now.plusSeconds(1));

    SecurityAuditEvent saved = repository.save(retained);
    repository.save(expired);
    auditJpa.flush();

    assertThat(saved.target()).contains(new AuditTarget(AuditTargetType.ACCOUNT, userId));
    assertThat(repository.deleteExpiredBefore(now)).isOne();
    assertThat(auditJpa.findAll())
        .singleElement()
        .extracting(SecurityAuditEventEntity::getId)
        .isEqualTo(retained.id());
  }

  private static ProductActivityEvent activity(
      UUID userId, UUID taskId, ActivityEventType eventType, Instant occurredAt) {
    return new ProductActivityEvent(
        UUID.randomUUID(),
        userId,
        userId,
        eventType,
        ActivitySubjectType.TASK,
        taskId,
        "repository-test",
        occurredAt);
  }

  private static SecurityAuditEvent audit(UUID userId, Instant occurredAt, Instant expiresAt) {
    return new SecurityAuditEvent(
        UUID.randomUUID(),
        SecurityAuditEventType.ACCOUNT_CREATED,
        AuditOutcome.SUCCEEDED,
        Optional.of(userId),
        Optional.of(userId),
        Optional.of(new AuditTarget(AuditTargetType.ACCOUNT, userId)),
        "repository-test",
        occurredAt,
        expiresAt);
  }
}
