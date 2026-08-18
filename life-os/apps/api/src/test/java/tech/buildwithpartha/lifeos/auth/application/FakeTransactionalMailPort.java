package tech.buildwithpartha.lifeos.auth.application;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort;

final class FakeTransactionalMailPort implements TransactionalMailPort {

  private final List<Enqueued> enqueued = new ArrayList<>();

  @Override
  public void enqueue(
      UUID accountId,
      MailMessageKind kind,
      MailRecipient recipient,
      MailTemplateVariables templateVariables) {
    enqueued.add(new Enqueued(accountId, kind, recipient, templateVariables));
  }

  List<Enqueued> all() {
    return List.copyOf(enqueued);
  }

  record Enqueued(
      UUID accountId,
      MailMessageKind kind,
      MailRecipient recipient,
      MailTemplateVariables templateVariables) {}
}
