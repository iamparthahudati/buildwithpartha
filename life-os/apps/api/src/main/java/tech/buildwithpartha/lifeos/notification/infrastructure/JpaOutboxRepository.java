package tech.buildwithpartha.lifeos.notification.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessage;
import tech.buildwithpartha.lifeos.notification.domain.OutboxRepository;

@Component
class JpaOutboxRepository implements OutboxRepository {

  private final OutboxMessageJpaRepository jpaRepository;

  JpaOutboxRepository(OutboxMessageJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public OutboxMessage save(OutboxMessage message) {
    return toDomain(jpaRepository.save(toEntity(message)));
  }

  @Override
  public List<OutboxMessage> findDueForDispatch(Instant now, int limit) {
    return jpaRepository.findDueForDispatch(now, limit).stream()
        .map(JpaOutboxRepository::toDomain)
        .toList();
  }

  @Override
  public int deleteTerminalOlderThan(Instant cutoff) {
    return jpaRepository.deleteTerminalOlderThan(cutoff);
  }

  private static OutboxMessageEntity toEntity(OutboxMessage message) {
    return new OutboxMessageEntity(
        message.id(),
        message.accountId().orElse(null),
        message.kind(),
        message.recipient().email(),
        message.templateVariables().asMap(),
        message.status(),
        message.attemptCount(),
        message.nextAttemptAt(),
        message.lastAttemptAt().orElse(null),
        message.lastErrorClass().orElse(null),
        message.providerMessageId().orElse(null),
        message.sentAt().orElse(null),
        message.deadLetteredAt().orElse(null),
        message.createdAt(),
        message.updatedAt());
  }

  private static OutboxMessage toDomain(OutboxMessageEntity entity) {
    return new OutboxMessage(
        entity.getId(),
        Optional.ofNullable(entity.getUserId()),
        entity.getMessageKind(),
        MailRecipient.of(entity.getRecipientEmail()),
        MailTemplateVariables.of(entity.getTemplateVariables()),
        entity.getStatus(),
        entity.getAttemptCount(),
        entity.getNextAttemptAt(),
        Optional.ofNullable(entity.getLastAttemptAt()),
        Optional.ofNullable(entity.getLastErrorClass()),
        Optional.ofNullable(entity.getProviderMessageId()),
        Optional.ofNullable(entity.getSentAt()),
        Optional.ofNullable(entity.getDeadLetteredAt()),
        entity.getCreatedAt(),
        entity.getUpdatedAt());
  }
}
