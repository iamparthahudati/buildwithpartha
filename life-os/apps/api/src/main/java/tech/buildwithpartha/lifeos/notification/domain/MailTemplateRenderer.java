package tech.buildwithpartha.lifeos.notification.domain;

import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;

/** Renders a {@link MailMessageKind}'s bundled template with the given substitution values. */
public interface MailTemplateRenderer {

  /**
   * @throws MailTemplateRenderException if a template placeholder has no corresponding variable
   */
  RenderedMailMessage render(MailMessageKind kind, MailTemplateVariables variables);
}
