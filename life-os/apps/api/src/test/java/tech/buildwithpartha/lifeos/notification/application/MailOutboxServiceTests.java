package tech.buildwithpartha.lifeos.notification.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessage;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessageStatus;

class MailOutboxServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void enqueuePersistsAPendingMessageAndReturnsItsId() {
    FakeOutboxRepository repository = new FakeOutboxRepository();
    Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    MailOutboxService service = new MailOutboxService(repository, clock);
    UUID accountId = UUID.randomUUID();

    UUID id =
        service.enqueue(
            Optional.of(accountId),
            MailMessageKind.EMAIL_VERIFICATION,
            MailRecipient.of("user@example.test"),
            MailTemplateVariables.of(Map.of("token", "abc")));

    OutboxMessage saved = repository.get(id);
    assertThat(saved).isNotNull();
    assertThat(saved.id()).isEqualTo(id);
    assertThat(saved.accountId()).contains(accountId);
    assertThat(saved.status()).isEqualTo(OutboxMessageStatus.PENDING);
    assertThat(saved.kind()).isEqualTo(MailMessageKind.EMAIL_VERIFICATION);
    assertThat(saved.recipient()).isEqualTo(MailRecipient.of("user@example.test"));
    assertThat(saved.createdAt()).isEqualTo(NOW);
    assertThat(saved.nextAttemptAt()).isEqualTo(NOW);
  }

  @Test
  void eachEnqueueCallGeneratesADistinctId() {
    FakeOutboxRepository repository = new FakeOutboxRepository();
    MailOutboxService service = new MailOutboxService(repository, Clock.fixed(NOW, ZoneOffset.UTC));

    UUID first =
        service.enqueue(
            Optional.empty(),
            MailMessageKind.PASSWORD_RESET,
            MailRecipient.of("a@example.test"),
            MailTemplateVariables.empty());
    UUID second =
        service.enqueue(
            Optional.empty(),
            MailMessageKind.PASSWORD_RESET,
            MailRecipient.of("b@example.test"),
            MailTemplateVariables.empty());

    assertThat(first).isNotEqualTo(second);
    assertThat(repository.all()).hasSize(2);
  }
}
