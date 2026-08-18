package tech.buildwithpartha.lifeos.notification.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import jakarta.mail.internet.MimeMessage;
import java.net.URI;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.config.LifeOsEnvironmentProperties;
import tech.buildwithpartha.lifeos.notification.domain.MailTransportException;
import tech.buildwithpartha.lifeos.notification.domain.RenderedMailMessage;

class JavaMailSenderMailTransportTests {

  private static final LifeOsEnvironmentProperties PROPERTIES =
      new LifeOsEnvironmentProperties(
          URI.create("https://lifeos.example.test"), true, "lifeos@example.test");

  @Test
  void sendsARenderedMessageAndReturnsAMessageId() throws Exception {
    FakeJavaMailSender mailSender = new FakeJavaMailSender();
    JavaMailSenderMailTransport transport = new JavaMailSenderMailTransport(mailSender, PROPERTIES);

    String providerMessageId =
        transport.send(
            new RenderedMailMessage("Verify your email", "Body text"),
            MailRecipient.of("user@example.test"));

    assertThat(mailSender.sentMessages()).hasSize(1);
    MimeMessage sent = mailSender.sentMessages().get(0);
    assertThat(sent.getSubject()).isEqualTo("Verify your email");
    assertThat(sent.getAllRecipients()[0].toString()).isEqualTo("user@example.test");
    assertThat(sent.getFrom()[0].toString()).isEqualTo("lifeos@example.test");
    assertThat(providerMessageId).isNotBlank();
  }

  @Test
  void wrapsATransportFailureWithoutLeakingItsRawMessage() {
    FakeJavaMailSender mailSender = new FakeJavaMailSender();
    mailSender.failNextSendWith(
        new MailSendException("smtp connection refused to internal-host:25, credentials=secret"));
    JavaMailSenderMailTransport transport = new JavaMailSenderMailTransport(mailSender, PROPERTIES);

    assertThatThrownBy(
            () ->
                transport.send(
                    new RenderedMailMessage("Subject", "Body"),
                    MailRecipient.of("user@example.test")))
        .isInstanceOf(MailTransportException.class)
        .hasMessage("Mail transport rejected the message")
        .hasMessageNotContaining("internal-host")
        .hasMessageNotContaining("secret");
  }
}
