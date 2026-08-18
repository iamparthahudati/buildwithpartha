package tech.buildwithpartha.lifeos.notification.infrastructure;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.config.LifeOsEnvironmentProperties;
import tech.buildwithpartha.lifeos.notification.domain.MailTransport;
import tech.buildwithpartha.lifeos.notification.domain.MailTransportException;
import tech.buildwithpartha.lifeos.notification.domain.RenderedMailMessage;

/**
 * Sends a rendered message via Spring's {@link JavaMailSender}, already configured from {@code
 * spring.mail.*} (LOS-0202). Plain SMTP has no server-assigned delivery id to report back, so the
 * JavaMail-generated {@code Message-ID} header — populated once the message is sent — is returned
 * as the provider message id for troubleshooting.
 */
@Component
class JavaMailSenderMailTransport implements MailTransport {

  private final JavaMailSender mailSender;
  private final String mailFrom;

  JavaMailSenderMailTransport(
      JavaMailSender mailSender, LifeOsEnvironmentProperties environmentProperties) {
    this.mailSender = mailSender;
    this.mailFrom = environmentProperties.mailFrom();
  }

  @Override
  public String send(RenderedMailMessage message, MailRecipient recipient) {
    MimeMessage mimeMessage = mailSender.createMimeMessage();
    try {
      MimeMessageHelper helper =
          new MimeMessageHelper(mimeMessage, false, StandardCharsets.UTF_8.name());
      helper.setFrom(mailFrom);
      helper.setTo(recipient.email());
      helper.setSubject(message.subject());
      helper.setText(message.body(), false);
    } catch (MessagingException e) {
      throw new MailTransportException("Unable to build the mail message", e);
    }

    try {
      mailSender.send(mimeMessage);
    } catch (MailException e) {
      throw new MailTransportException("Mail transport rejected the message", e);
    }

    return providerMessageId(mimeMessage);
  }

  private static String providerMessageId(MimeMessage mimeMessage) {
    try {
      String messageId = mimeMessage.getMessageID();
      return messageId != null ? messageId : "unknown";
    } catch (MessagingException e) {
      return "unknown";
    }
  }
}
