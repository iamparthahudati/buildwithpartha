package tech.buildwithpartha.lifeos.common.mail;

import java.util.Objects;

/**
 * The address a transactional mail message is sent to.
 *
 * <p>The caller is responsible for normalizing/validating the address before crossing this boundary
 * (for example via {@code auth.domain.EmailAddress}); this type only guards against a null or blank
 * value.
 */
public record MailRecipient(String email) {

  public MailRecipient {
    Objects.requireNonNull(email, "email must not be null");
    if (email.isBlank()) {
      throw new IllegalArgumentException("email must not be blank");
    }
  }

  public static MailRecipient of(String email) {
    return new MailRecipient(email);
  }
}
