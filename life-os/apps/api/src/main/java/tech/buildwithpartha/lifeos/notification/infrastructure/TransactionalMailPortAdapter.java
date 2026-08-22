package tech.buildwithpartha.lifeos.notification.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort;
import tech.buildwithpartha.lifeos.notification.application.MailOutboxService;

/**
 * Implements the cross-domain {@link TransactionalMailPort} contract by delegating to {@link
 * MailOutboxService}. This is the bean another domain (for example {@code auth.application},
 * LOS-0503) resolves {@link TransactionalMailPort} to, without depending on any other {@code
 * notification} internals.
 */
@Component
class TransactionalMailPortAdapter implements TransactionalMailPort {

  private final MailOutboxService mailOutboxService;

  TransactionalMailPortAdapter(MailOutboxService mailOutboxService) {
    this.mailOutboxService = mailOutboxService;
  }

  @Override
  public void enqueue(
      UUID accountId,
      MailMessageKind kind,
      MailRecipient recipient,
      MailTemplateVariables templateVariables) {
    mailOutboxService.enqueue(Optional.ofNullable(accountId), kind, recipient, templateVariables);
  }
}
