package tech.buildwithpartha.lifeos.notification.application;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessage;
import tech.buildwithpartha.lifeos.notification.domain.OutboxRepository;

/**
 * Enqueues an {@link OutboxMessage}. {@link #enqueue} runs with default ({@code REQUIRED})
 * transaction propagation so it joins the caller's own transaction — the enqueue commits or rolls
 * back atomically with whatever write triggered it (LOS-1402's "transactional" outbox guarantee).
 * Exposed to other domains only through {@code common.mail.TransactionalMailPort}, implemented by
 * {@code notification.infrastructure.TransactionalMailPortAdapter}.
 */
@Service
public class MailOutboxService {

  private final OutboxRepository outboxRepository;
  private final Clock clock;

  public MailOutboxService(OutboxRepository outboxRepository, Clock clock) {
    this.outboxRepository = outboxRepository;
    this.clock = clock;
  }

  @Transactional
  public UUID enqueue(
      Optional<UUID> accountId,
      MailMessageKind kind,
      MailRecipient recipient,
      MailTemplateVariables templateVariables) {
    UUID id = UUID.randomUUID();
    Instant now = clock.instant();
    OutboxMessage message =
        OutboxMessage.enqueue(id, accountId, kind, recipient, templateVariables, now);
    outboxRepository.save(message);
    return id;
  }
}
