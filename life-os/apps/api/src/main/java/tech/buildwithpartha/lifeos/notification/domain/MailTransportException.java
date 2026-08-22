package tech.buildwithpartha.lifeos.notification.domain;

/**
 * A {@link MailTransport} could not send a message. Carries only a message safe to log (never the
 * underlying transport exception's own message, which may echo SMTP server detail).
 */
public class MailTransportException extends RuntimeException {

  public MailTransportException(String message) {
    super(message);
  }

  public MailTransportException(String message, Throwable cause) {
    super(message, cause);
  }
}
