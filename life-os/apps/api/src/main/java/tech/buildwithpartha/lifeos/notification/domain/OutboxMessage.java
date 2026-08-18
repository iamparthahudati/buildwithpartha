package tech.buildwithpartha.lifeos.notification.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;

/**
 * A transactional outbox row: one verification/reset/security mail message, from enqueue through
 * delivery or dead-letter.
 *
 * <p>{@link #templateVariables()} may carry a single-use raw token/URL, so every transition to a
 * terminal state ({@link #recordSuccess}, and {@link #recordFailure} once the retry budget is
 * exhausted) wipes it to {@link MailTemplateVariables#empty()} — matching the "outbox payloads are
 * erased after delivery/final failure" requirement in {@code 31-PRIVACY-DATA-LIFECYCLE.md}. A
 * failure that will still be retried keeps the variables, since they're needed to re-render the
 * message on the next attempt.
 */
public record OutboxMessage(
    UUID id,
    Optional<UUID> accountId,
    MailMessageKind kind,
    MailRecipient recipient,
    MailTemplateVariables templateVariables,
    OutboxMessageStatus status,
    int attemptCount,
    Instant nextAttemptAt,
    Optional<Instant> lastAttemptAt,
    Optional<String> lastErrorClass,
    Optional<String> providerMessageId,
    Optional<Instant> sentAt,
    Optional<Instant> deadLetteredAt,
    Instant createdAt,
    Instant updatedAt) {

  public OutboxMessage {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(accountId, "accountId must not be null");
    Objects.requireNonNull(kind, "kind must not be null");
    Objects.requireNonNull(recipient, "recipient must not be null");
    Objects.requireNonNull(templateVariables, "templateVariables must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(nextAttemptAt, "nextAttemptAt must not be null");
    Objects.requireNonNull(lastAttemptAt, "lastAttemptAt must not be null");
    Objects.requireNonNull(lastErrorClass, "lastErrorClass must not be null");
    Objects.requireNonNull(providerMessageId, "providerMessageId must not be null");
    Objects.requireNonNull(sentAt, "sentAt must not be null");
    Objects.requireNonNull(deadLetteredAt, "deadLetteredAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    if (attemptCount < 0) {
      throw new IllegalArgumentException("attemptCount must be zero or greater");
    }
  }

  public static OutboxMessage enqueue(
      UUID id,
      Optional<UUID> accountId,
      MailMessageKind kind,
      MailRecipient recipient,
      MailTemplateVariables templateVariables,
      Instant now) {
    return new OutboxMessage(
        id,
        accountId,
        kind,
        recipient,
        templateVariables,
        OutboxMessageStatus.PENDING,
        0,
        now,
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        now,
        now);
  }

  public boolean isDueForDispatch(Instant now) {
    return status == OutboxMessageStatus.PENDING && !nextAttemptAt.isAfter(now);
  }

  /** Records a successful delivery: terminal {@code SENT}, template variables wiped. */
  public OutboxMessage recordSuccess(Instant now, String providerMessageId) {
    Objects.requireNonNull(now, "now must not be null");
    Objects.requireNonNull(providerMessageId, "providerMessageId must not be null");
    return new OutboxMessage(
        id,
        accountId,
        kind,
        recipient,
        MailTemplateVariables.empty(),
        OutboxMessageStatus.SENT,
        attemptCount,
        nextAttemptAt,
        Optional.of(now),
        lastErrorClass,
        Optional.of(providerMessageId),
        Optional.of(now),
        deadLetteredAt,
        createdAt,
        now);
  }

  /**
   * Records a failed delivery attempt. Stays {@code PENDING} with an advanced {@code nextAttemptAt}
   * while the retry budget remains, or moves to terminal {@code DEAD_LETTERED} with template
   * variables wiped once {@code retryPolicy} is exhausted.
   */
  public OutboxMessage recordFailure(
      Instant now, String sanitizedErrorClass, RetryPolicy retryPolicy) {
    Objects.requireNonNull(now, "now must not be null");
    Objects.requireNonNull(sanitizedErrorClass, "sanitizedErrorClass must not be null");
    Objects.requireNonNull(retryPolicy, "retryPolicy must not be null");

    int newAttemptCount = attemptCount + 1;
    if (retryPolicy.isExhausted(newAttemptCount)) {
      return new OutboxMessage(
          id,
          accountId,
          kind,
          recipient,
          MailTemplateVariables.empty(),
          OutboxMessageStatus.DEAD_LETTERED,
          newAttemptCount,
          nextAttemptAt,
          Optional.of(now),
          Optional.of(sanitizedErrorClass),
          providerMessageId,
          sentAt,
          Optional.of(now),
          createdAt,
          now);
    }
    return new OutboxMessage(
        id,
        accountId,
        kind,
        recipient,
        templateVariables,
        OutboxMessageStatus.PENDING,
        newAttemptCount,
        now.plus(retryPolicy.delayFor(newAttemptCount)),
        Optional.of(now),
        Optional.of(sanitizedErrorClass),
        providerMessageId,
        sentAt,
        deadLetteredAt,
        createdAt,
        now);
  }
}
