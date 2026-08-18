package tech.buildwithpartha.lifeos.notification.application;

import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.notification.domain.MailTemplateRenderer;
import tech.buildwithpartha.lifeos.notification.domain.RenderedMailMessage;

final class FakeMailTemplateRenderer implements MailTemplateRenderer {

  @Override
  public RenderedMailMessage render(MailMessageKind kind, MailTemplateVariables variables) {
    return new RenderedMailMessage("subject-for-" + kind, "body-containing " + variables.asMap());
  }
}
