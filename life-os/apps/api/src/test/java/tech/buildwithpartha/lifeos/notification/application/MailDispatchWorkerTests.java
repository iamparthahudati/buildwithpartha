package tech.buildwithpartha.lifeos.notification.application;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessage;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessageStatus;
import tech.buildwithpartha.lifeos.notification.domain.RetryPolicy;

class MailDispatchWorkerTests {

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void successfulSendMarksSentAndClearsTemplateVariables() {
    FakeOutboxRepository repository = new FakeOutboxRepository();
    OutboxMessage message = enqueue(repository, "token-value-1");
    FakeMailTransport transport = new FakeMailTransport();
    MailDispatchWorker worker = worker(repository, transport, new FakeMailTemplateRenderer());

    worker.pollAndDispatch();

    OutboxMessage updated = repository.get(message.id());
    assertThat(updated.status()).isEqualTo(OutboxMessageStatus.SENT);
    assertThat(updated.templateVariables()).isEqualTo(MailTemplateVariables.empty());
    assertThat(updated.providerMessageId()).isPresent();
    assertThat(transport.sentMessages()).hasSize(1);
  }

  @Test
  void failureBelowMaxAttemptsStaysPendingWithAdvancedNextAttempt() {
    FakeOutboxRepository repository = new FakeOutboxRepository();
    OutboxMessage message = enqueue(repository, "token-value-2");
    FakeMailTransport transport = new FakeMailTransport();
    transport.failNextSendsWith(new RuntimeException("smtp unavailable"));
    MailDispatchWorker worker = worker(repository, transport, new FakeMailTemplateRenderer());

    worker.pollAndDispatch();

    OutboxMessage updated = repository.get(message.id());
    assertThat(updated.status()).isEqualTo(OutboxMessageStatus.PENDING);
    assertThat(updated.attemptCount()).isEqualTo(1);
    assertThat(updated.nextAttemptAt()).isAfter(NOW);
  }

  @Test
  void failureAtMaxAttemptsDeadLetters() {
    FakeOutboxRepository repository = new FakeOutboxRepository();
    // One failure away from exhausting the retry budget, and due right now — isolates the
    // worker's terminal transition from the backoff progression already covered by
    // OutboxMessageTests and RetryPolicyTests.
    OutboxMessage message =
        new OutboxMessage(
            UUID.randomUUID(),
            Optional.empty(),
            MailMessageKind.EMAIL_VERIFICATION,
            MailRecipient.of("user@example.test"),
            MailTemplateVariables.of(Map.of("verificationToken", "token-value-3")),
            OutboxMessageStatus.PENDING,
            RetryPolicy.MAX_ATTEMPTS - 1,
            NOW,
            Optional.of(NOW),
            Optional.of("java.io.IOException"),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            NOW,
            NOW);
    repository.save(message);

    FakeMailTransport transport = new FakeMailTransport();
    transport.failNextSendsWith(new RuntimeException("smtp unavailable"));
    MailDispatchWorker worker = worker(repository, transport, new FakeMailTemplateRenderer());

    worker.pollAndDispatch();

    OutboxMessage updated = repository.get(message.id());
    assertThat(updated.status()).isEqualTo(OutboxMessageStatus.DEAD_LETTERED);
    assertThat(updated.attemptCount()).isEqualTo(RetryPolicy.MAX_ATTEMPTS);
    assertThat(updated.templateVariables()).isEqualTo(MailTemplateVariables.empty());
  }

  @Test
  void aMessageNotYetDueIsNotDispatched() {
    FakeOutboxRepository repository = new FakeOutboxRepository();
    OutboxMessage notYetDue =
        OutboxMessage.enqueue(
            UUID.randomUUID(),
            Optional.empty(),
            MailMessageKind.EMAIL_VERIFICATION,
            MailRecipient.of("future@example.test"),
            MailTemplateVariables.empty(),
            NOW.plusSeconds(3600));
    repository.save(notYetDue);
    FakeMailTransport transport = new FakeMailTransport();
    MailDispatchWorker worker = worker(repository, transport, new FakeMailTemplateRenderer());

    worker.pollAndDispatch();

    assertThat(transport.sentMessages()).isEmpty();
    assertThat(repository.get(notYetDue.id()).status()).isEqualTo(OutboxMessageStatus.PENDING);
  }

  @Test
  void oneFailingMessageDoesNotPreventOthersFromDispatching() {
    FakeOutboxRepository repository = new FakeOutboxRepository();
    OutboxMessage first = enqueue(repository, "token-a");
    OutboxMessage second = enqueue(repository, "token-b");

    FailFirstThenSucceedTransport transport = new FailFirstThenSucceedTransport("token-a");
    MailDispatchWorker worker = worker(repository, transport, new FakeMailTemplateRenderer());

    worker.pollAndDispatch();

    assertThat(repository.get(first.id()).status()).isEqualTo(OutboxMessageStatus.PENDING);
    assertThat(repository.get(second.id()).status()).isEqualTo(OutboxMessageStatus.SENT);
  }

  @Test
  void logsNeverIncludeARawTemplateVariableValue() {
    FakeOutboxRepository repository = new FakeOutboxRepository();
    enqueue(repository, "extremely-secret-token-xyz");
    FakeMailTransport transport = new FakeMailTransport();
    MailDispatchWorker worker = worker(repository, transport, new FakeMailTemplateRenderer());

    Logger logbackLogger = (Logger) LoggerFactory.getLogger(MailDispatchWorker.class);
    ListAppender<ILoggingEvent> appender = new ListAppender<>();
    appender.start();
    logbackLogger.addAppender(appender);
    try {
      worker.pollAndDispatch();
    } finally {
      logbackLogger.detachAppender(appender);
    }

    List<String> formattedMessages =
        appender.list.stream().map(ILoggingEvent::getFormattedMessage).toList();
    assertThat(formattedMessages).isNotEmpty();
    assertThat(formattedMessages)
        .noneMatch(message -> message.contains("extremely-secret-token-xyz"));
  }

  private static OutboxMessage enqueue(FakeOutboxRepository repository, String token) {
    OutboxMessage message =
        OutboxMessage.enqueue(
            UUID.randomUUID(),
            Optional.empty(),
            MailMessageKind.EMAIL_VERIFICATION,
            MailRecipient.of("user@example.test"),
            MailTemplateVariables.of(Map.of("verificationToken", token)),
            NOW);
    repository.save(message);
    return message;
  }

  private static MailDispatchWorker worker(
      FakeOutboxRepository repository,
      tech.buildwithpartha.lifeos.notification.domain.MailTransport transport,
      FakeMailTemplateRenderer renderer) {
    return new MailDispatchWorker(
        repository, transport, renderer, Clock.fixed(NOW, ZoneOffset.UTC));
  }

  /** Fails to send exactly the message whose rendered body contains {@code failingBodyMarker}. */
  private static final class FailFirstThenSucceedTransport
      implements tech.buildwithpartha.lifeos.notification.domain.MailTransport {

    private final String failingBodyMarker;

    FailFirstThenSucceedTransport(String failingBodyMarker) {
      this.failingBodyMarker = failingBodyMarker;
    }

    @Override
    public String send(
        tech.buildwithpartha.lifeos.notification.domain.RenderedMailMessage message,
        MailRecipient recipient) {
      if (message.body().contains(failingBodyMarker)) {
        throw new RuntimeException("simulated transport failure");
      }
      return "provider-message-id";
    }
  }
}
