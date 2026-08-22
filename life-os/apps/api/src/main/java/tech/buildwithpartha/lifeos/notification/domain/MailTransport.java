package tech.buildwithpartha.lifeos.notification.domain;

import tech.buildwithpartha.lifeos.common.mail.MailRecipient;

/** Sends a rendered mail message through whatever SMTP technology is configured. */
public interface MailTransport {

  /**
   * @return a provider message id for delivery troubleshooting; never the message body
   * @throws MailTransportException if the transport could not send the message
   */
  String send(RenderedMailMessage message, MailRecipient recipient);
}
