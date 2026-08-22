package tech.buildwithpartha.lifeos.notification.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessage;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessageStatus;

class OutboxCleanupJobTests {

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void deletesOnlyTerminalRowsOlderThanSevenDays() {
    FakeOutboxRepository repository = new FakeOutboxRepository();

    UUID oldSent = terminal(repository, OutboxMessageStatus.SENT, NOW.minus(8, ChronoUnit.DAYS));
    UUID recentSent =
        terminal(repository, OutboxMessageStatus.SENT, NOW.minus(1, ChronoUnit.HOURS));
    UUID oldDeadLettered =
        terminal(repository, OutboxMessageStatus.DEAD_LETTERED, NOW.minus(10, ChronoUnit.DAYS));
    UUID oldPending = pending(repository, NOW.minus(30, ChronoUnit.DAYS));

    OutboxCleanupJob job = new OutboxCleanupJob(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    job.purgeExpiredTerminalMessages();

    assertThat(repository.get(oldSent)).isNull();
    assertThat(repository.get(oldDeadLettered)).isNull();
    assertThat(repository.get(recentSent)).isNotNull();
    assertThat(repository.get(oldPending)).isNotNull();
  }

  private static UUID terminal(
      FakeOutboxRepository repository, OutboxMessageStatus status, Instant updatedAt) {
    UUID id = UUID.randomUUID();
    repository.save(
        new OutboxMessage(
            id,
            Optional.empty(),
            MailMessageKind.EMAIL_VERIFICATION,
            MailRecipient.of("user@example.test"),
            MailTemplateVariables.empty(),
            status,
            1,
            NOW,
            Optional.of(updatedAt),
            Optional.empty(),
            Optional.of("provider-id"),
            status == OutboxMessageStatus.SENT ? Optional.of(updatedAt) : Optional.empty(),
            status == OutboxMessageStatus.DEAD_LETTERED ? Optional.of(updatedAt) : Optional.empty(),
            updatedAt,
            updatedAt));
    return id;
  }

  private static UUID pending(FakeOutboxRepository repository, Instant updatedAt) {
    UUID id = UUID.randomUUID();
    repository.save(
        new OutboxMessage(
            id,
            Optional.empty(),
            MailMessageKind.EMAIL_VERIFICATION,
            MailRecipient.of("user@example.test"),
            MailTemplateVariables.of(Map.of("token", "value")),
            OutboxMessageStatus.PENDING,
            1,
            updatedAt,
            Optional.of(updatedAt),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            updatedAt,
            updatedAt));
    return id;
  }
}
