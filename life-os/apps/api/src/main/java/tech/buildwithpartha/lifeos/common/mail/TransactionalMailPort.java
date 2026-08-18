package tech.buildwithpartha.lifeos.common.mail;

import java.util.UUID;

/**
 * Transactionally enqueues verification/reset/security mail (LOS-1402).
 *
 * <p>An implementation must join the caller's ambient transaction (default {@code REQUIRED}
 * propagation) so the enqueued outbox row commits or rolls back atomically with the caller's own
 * write — this is the "transactional" half of the transactional outbox pattern. Actual delivery
 * happens later, asynchronously, on the mail worker; duplicate delivery is harmless.
 */
public interface TransactionalMailPort {

  /**
   * @param accountId the account the message concerns, or {@code null} when none exists yet (for
   *     example a signup verification email sent before the account is fully provisioned)
   */
  void enqueue(
      UUID accountId,
      MailMessageKind kind,
      MailRecipient recipient,
      MailTemplateVariables templateVariables);
}
