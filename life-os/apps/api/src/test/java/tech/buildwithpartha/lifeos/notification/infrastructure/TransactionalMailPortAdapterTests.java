package tech.buildwithpartha.lifeos.notification.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.notification.application.MailOutboxService;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessage;
import tech.buildwithpartha.lifeos.notification.domain.OutboxRepository;

class TransactionalMailPortAdapterTests {

  @Test
  void delegatesToMailOutboxServiceWithCorrectlyTranslatedTypes() {
    RecordingOutboxRepository repository = new RecordingOutboxRepository();
    Instant now = Instant.parse("2026-08-18T00:00:00Z");
    MailOutboxService mailOutboxService =
        new MailOutboxService(repository, Clock.fixed(now, ZoneOffset.UTC));
    TransactionalMailPortAdapter adapter = new TransactionalMailPortAdapter(mailOutboxService);
    UUID accountId = UUID.randomUUID();

    adapter.enqueue(
        accountId,
        MailMessageKind.PASSWORD_RESET,
        MailRecipient.of("user@example.test"),
        MailTemplateVariables.of(Map.of("resetUrl", "https://lifeos.example.test/reset/1")));

    assertThat(repository.saved).hasSize(1);
    OutboxMessage saved = repository.saved.get(0);
    assertThat(saved.accountId()).contains(accountId);
    assertThat(saved.kind()).isEqualTo(MailMessageKind.PASSWORD_RESET);
    assertThat(saved.recipient()).isEqualTo(MailRecipient.of("user@example.test"));
    assertThat(saved.templateVariables().asMap())
        .containsEntry("resetUrl", "https://lifeos.example.test/reset/1");
  }

  @Test
  void translatesANullAccountIdToAnEmptyOptional() {
    RecordingOutboxRepository repository = new RecordingOutboxRepository();
    MailOutboxService mailOutboxService =
        new MailOutboxService(repository, Clock.fixed(Instant.now(), ZoneOffset.UTC));
    TransactionalMailPortAdapter adapter = new TransactionalMailPortAdapter(mailOutboxService);

    adapter.enqueue(
        null,
        MailMessageKind.EMAIL_VERIFICATION,
        MailRecipient.of("user@example.test"),
        MailTemplateVariables.empty());

    assertThat(repository.saved.get(0).accountId()).isEmpty();
  }

  private static final class RecordingOutboxRepository implements OutboxRepository {

    private final List<OutboxMessage> saved = new ArrayList<>();

    @Override
    public OutboxMessage save(OutboxMessage message) {
      saved.add(message);
      return message;
    }

    @Override
    public List<OutboxMessage> findDueForDispatch(Instant now, int limit) {
      return List.of();
    }

    @Override
    public int deleteTerminalOlderThan(Instant cutoff) {
      return 0;
    }
  }
}
