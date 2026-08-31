package tech.buildwithpartha.lifeos.notification.domain;

/** Thrown when trying to clear a non-clearable notification (LOS-1303). */
public class NotificationNotClearableException extends RuntimeException {

  public NotificationNotClearableException(String message) {
    super(message);
  }
}
