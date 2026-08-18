package tech.buildwithpartha.lifeos.notification.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;

class OutboxMessageTests {

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");
  private final RetryPolicy retryPolicy = new RetryPolicy();

  @Test
  void enqueueStartsPendingWithZeroAttempts() {
    OutboxMessage message = newMessage();

    assertThat(message.status()).isEqualTo(OutboxMessageStatus.PENDING);
    assertThat(message.attemptCount()).isZero();
    assertThat(message.nextAttemptAt()).isEqualTo(NOW);
    assertThat(message.lastAttemptAt()).isEmpty();
    assertThat(message.sentAt()).isEmpty();
    assertThat(message.deadLetteredAt()).isEmpty();
  }

  @Test
  void recordSuccessMovesToSentAndWipesTemplateVariables() {
    OutboxMessage message = newMessage();
    Instant sentAt = NOW.plusSeconds(5);

    OutboxMessage updated = message.recordSuccess(sentAt, "message-id-1");

    assertThat(updated.status()).isEqualTo(OutboxMessageStatus.SENT);
    assertThat(updated.sentAt()).contains(sentAt);
    assertThat(updated.providerMessageId()).contains("message-id-1");
    assertThat(updated.templateVariables()).isEqualTo(MailTemplateVariables.empty());
  }

  @Test
  void recordFailureBelowMaxAttemptsStaysPendingAndRetainsVariables() {
    OutboxMessage message = newMessage();
    Instant failedAt = NOW.plusSeconds(5);

    OutboxMessage updated = message.recordFailure(failedAt, "java.io.IOException", retryPolicy);

    assertThat(updated.status()).isEqualTo(OutboxMessageStatus.PENDING);
    assertThat(updated.attemptCount()).isEqualTo(1);
    assertThat(updated.nextAttemptAt()).isEqualTo(failedAt.plus(retryPolicy.delayFor(1)));
    assertThat(updated.lastErrorClass()).contains("java.io.IOException");
    assertThat(updated.templateVariables().asMap()).containsEntry("token", "secret");
    assertThat(updated.deadLetteredAt()).isEmpty();
  }

  @Test
  void recordFailureAtMaxAttemptsDeadLettersAndWipesVariables() {
    OutboxMessage message = newMessage();
    Instant failedAt = NOW.plusSeconds(5);

    OutboxMessage updated = message;
    for (int attempt = 1; attempt <= RetryPolicy.MAX_ATTEMPTS; attempt++) {
      updated = updated.recordFailure(failedAt, "java.io.IOException", retryPolicy);
    }

    assertThat(updated.status()).isEqualTo(OutboxMessageStatus.DEAD_LETTERED);
    assertThat(updated.attemptCount()).isEqualTo(RetryPolicy.MAX_ATTEMPTS);
    assertThat(updated.deadLetteredAt()).contains(failedAt);
    assertThat(updated.templateVariables()).isEqualTo(MailTemplateVariables.empty());
  }

  @Test
  void isDueForDispatchIsTrueOnlyWhenPendingAndNotAfterNow() {
    OutboxMessage pendingDue = newMessage();
    assertThat(pendingDue.isDueForDispatch(NOW)).isTrue();
    assertThat(pendingDue.isDueForDispatch(NOW.minusSeconds(1))).isFalse();

    OutboxMessage sent = pendingDue.recordSuccess(NOW, "id");
    assertThat(sent.isDueForDispatch(NOW.plusSeconds(100))).isFalse();
  }

  private static OutboxMessage newMessage() {
    return OutboxMessage.enqueue(
        UUID.randomUUID(),
        Optional.empty(),
        MailMessageKind.EMAIL_VERIFICATION,
        MailRecipient.of("user@example.test"),
        MailTemplateVariables.of(Map.of("token", "secret")),
        NOW);
  }
}
