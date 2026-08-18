package tech.buildwithpartha.lifeos.notification.domain;

import java.util.Objects;

/** A mail template after its variables have been substituted, ready to send. */
public record RenderedMailMessage(String subject, String body) {

  public RenderedMailMessage {
    Objects.requireNonNull(subject, "subject must not be null");
    Objects.requireNonNull(body, "body must not be null");
    if (subject.isBlank()) {
      throw new IllegalArgumentException("subject must not be blank");
    }
    if (body.isBlank()) {
      throw new IllegalArgumentException("body must not be blank");
    }
  }
}
