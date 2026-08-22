package tech.buildwithpartha.lifeos.auth.domain;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Objects;

/**
 * An email address in both the form the user entered and the normalized form used for uniqueness
 * checks.
 *
 * <p>Normalization is NFC-normalize then lower-case, matching {@code users.email_normalized} in
 * {@code V2__identity_schema.sql}. It does not alter {@link #raw()}, which is what the user
 * actually sees and what mail is sent to.
 */
public record EmailAddress(String raw, String normalized) {

  public EmailAddress {
    Objects.requireNonNull(raw, "raw must not be null");
    Objects.requireNonNull(normalized, "normalized must not be null");
  }

  public static EmailAddress of(String rawEmail) {
    Objects.requireNonNull(rawEmail, "rawEmail must not be null");
    String trimmed = rawEmail.strip();
    if (trimmed.isEmpty()) {
      throw new IllegalArgumentException("rawEmail must not be blank");
    }
    return new EmailAddress(trimmed, normalize(trimmed));
  }

  private static String normalize(String email) {
    return Normalizer.normalize(email, Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
  }
}
