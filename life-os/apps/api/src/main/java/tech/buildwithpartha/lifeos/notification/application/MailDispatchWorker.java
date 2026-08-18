package tech.buildwithpartha.lifeos.notification.application;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.notification.domain.MailTemplateRenderer;
import tech.buildwithpartha.lifeos.notification.domain.MailTransport;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessage;
import tech.buildwithpartha.lifeos.notification.domain.OutboxRepository;
import tech.buildwithpartha.lifeos.notification.domain.RenderedMailMessage;
import tech.buildwithpartha.lifeos.notification.domain.RetryPolicy;

/**
 * Polls for due {@link OutboxMessage}s and dispatches them.
 *
 * <p>The deployment is a single backend instance ({@code 02-ARCHITECTURE.md}), so no row
 * leasing/locking is needed — a multi-instance-safe claim mechanism is in scope only for LOS-1403
 * if the deployment ever becomes multi-instance. {@link Scheduled#fixedDelay()} (not {@code
 * fixedRate}) guarantees one poll always finishes before the next starts. Each {@link
 * OutboxRepository#save} call is transactional per-call (Spring Data JPA's default), so one
 * message's failure in a batch never rolls back another message's successful send.
 *
 * <p>Log lines never include a template variable, rendered body, or raw exception message — only
 * the message id, kind, resulting status, attempt count, and a sanitized failure class name, per
 * {@code 06-SECURITY.md}'s log-redaction requirement.
 */
@Component
class MailDispatchWorker {

  private static final Logger log = LoggerFactory.getLogger(MailDispatchWorker.class);
  private static final int BATCH_SIZE = 20;

  private final OutboxRepository outboxRepository;
  private final MailTransport mailTransport;
  private final MailTemplateRenderer templateRenderer;
  private final Clock clock;
  private final RetryPolicy retryPolicy;

  MailDispatchWorker(
      OutboxRepository outboxRepository,
      MailTransport mailTransport,
      MailTemplateRenderer templateRenderer,
      Clock clock) {
    this.outboxRepository = outboxRepository;
    this.mailTransport = mailTransport;
    this.templateRenderer = templateRenderer;
    this.clock = clock;
    this.retryPolicy = new RetryPolicy();
  }

  @Scheduled(fixedDelay = 15_000)
  void pollAndDispatch() {
    Instant now = clock.instant();
    List<OutboxMessage> due = outboxRepository.findDueForDispatch(now, BATCH_SIZE);
    for (OutboxMessage message : due) {
      dispatchOne(message, now);
    }
  }

  private void dispatchOne(OutboxMessage message, Instant now) {
    try {
      RenderedMailMessage rendered =
          templateRenderer.render(message.kind(), message.templateVariables());
      String providerMessageId = mailTransport.send(rendered, message.recipient());
      OutboxMessage updated = message.recordSuccess(now, providerMessageId);
      outboxRepository.save(updated);
      log.info(
          "mail dispatch id={} kind={} status={} attempt={}",
          updated.id(),
          updated.kind(),
          updated.status(),
          updated.attemptCount());
    } catch (RuntimeException e) {
      String sanitizedErrorClass = rootCauseClassName(e);
      OutboxMessage updated = message.recordFailure(now, sanitizedErrorClass, retryPolicy);
      outboxRepository.save(updated);
      log.warn(
          "mail dispatch id={} kind={} status={} attempt={} errorClass={}",
          updated.id(),
          updated.kind(),
          updated.status(),
          updated.attemptCount(),
          sanitizedErrorClass);
    }
  }

  private static String rootCauseClassName(Throwable failure) {
    Throwable cause = failure;
    while (cause.getCause() != null && cause.getCause() != cause) {
      cause = cause.getCause();
    }
    return cause.getClass().getName();
  }
}
