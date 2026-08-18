package tech.buildwithpartha.lifeos.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessage;
import tech.buildwithpartha.lifeos.notification.domain.OutboxRepository;

/**
 * Proves Spring wires the real {@code notification.infrastructure} adapters — JPA persistence, the
 * bundled template renderer, and {@link TransactionalMailPort} — end to end, not only that the
 * fakes used by the unit tests behave. Deliberately does not exercise {@code MailDispatchWorker}
 * sending real SMTP traffic: nothing guarantees a mail catcher is reachable in CI, so real delivery
 * against Mailpit is a manual local-dev verification step (see the LOS-1402 handoff).
 */
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class MailOutboxWiringIT {

  private final TransactionalMailPort transactionalMailPort;
  private final OutboxRepository outboxRepository;

  @Autowired
  MailOutboxWiringIT(
      TransactionalMailPort transactionalMailPort, OutboxRepository outboxRepository) {
    this.transactionalMailPort = transactionalMailPort;
    this.outboxRepository = outboxRepository;
  }

  @Test
  void transactionalMailPortResolvesToTheRealAdapterAndPersistsThroughToTheDatabase() {
    assertThat(transactionalMailPort.getClass().getSimpleName())
        .isEqualTo("TransactionalMailPortAdapter");

    UUID accountId = UUID.randomUUID();
    transactionalMailPort.enqueue(
        accountId,
        MailMessageKind.EMAIL_VERIFICATION,
        MailRecipient.of("wiring-test@example.test"),
        MailTemplateVariables.of(Map.of("verificationToken", "wiring-test-token")));

    List<OutboxMessage> due =
        outboxRepository.findDueForDispatch(Instant.now().plusSeconds(60), 50);
    assertThat(due)
        .anySatisfy(
            message -> {
              assertThat(message.accountId()).contains(accountId);
              assertThat(message.recipient())
                  .isEqualTo(MailRecipient.of("wiring-test@example.test"));
            });
  }
}
