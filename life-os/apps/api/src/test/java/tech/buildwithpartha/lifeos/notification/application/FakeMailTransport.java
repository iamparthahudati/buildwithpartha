package tech.buildwithpartha.lifeos.notification.application;

import java.util.ArrayList;
import java.util.List;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.notification.domain.MailTransport;
import tech.buildwithpartha.lifeos.notification.domain.RenderedMailMessage;

final class FakeMailTransport implements MailTransport {

  private final List<RenderedMailMessage> sentMessages = new ArrayList<>();
  private RuntimeException failureToThrow;
  private String providerMessageIdToReturn = "fake-provider-message-id";

  @Override
  public String send(RenderedMailMessage message, MailRecipient recipient) {
    if (failureToThrow != null) {
      throw failureToThrow;
    }
    sentMessages.add(message);
    return providerMessageIdToReturn;
  }

  void failNextSendsWith(RuntimeException exception) {
    this.failureToThrow = exception;
  }

  List<RenderedMailMessage> sentMessages() {
    return sentMessages;
  }
}
