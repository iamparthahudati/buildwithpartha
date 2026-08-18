package tech.buildwithpartha.lifeos.notification.infrastructure;

import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Properties;
import org.springframework.mail.MailException;
import org.springframework.mail.MailParseException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

/** A hand-written {@link JavaMailSender} test double; no real SMTP connection is ever made. */
final class FakeJavaMailSender implements JavaMailSender {

  private final Session session = Session.getInstance(new Properties());
  private final List<MimeMessage> sentMessages = new ArrayList<>();
  private MailException failureToThrow;

  @Override
  public MimeMessage createMimeMessage() {
    return new MimeMessage(session);
  }

  @Override
  public MimeMessage createMimeMessage(InputStream contentStream) {
    try {
      return new MimeMessage(session, contentStream);
    } catch (MessagingException e) {
      throw new MailParseException("Unable to parse message", e);
    }
  }

  @Override
  public void send(MimeMessage... mimeMessages) {
    if (failureToThrow != null) {
      throw failureToThrow;
    }
    sentMessages.addAll(Arrays.asList(mimeMessages));
  }

  @Override
  public void send(SimpleMailMessage... simpleMessages) {
    throw new UnsupportedOperationException("JavaMailSenderMailTransport only sends MIME messages");
  }

  void failNextSendWith(MailException exception) {
    this.failureToThrow = exception;
  }

  List<MimeMessage> sentMessages() {
    return sentMessages;
  }
}
