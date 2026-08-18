package tech.buildwithpartha.lifeos.auth.domain;

import java.util.Objects;
import java.util.Optional;

/**
 * The outcome of checking a login attempt's password against the stored hash.
 *
 * <p>{@link #rehashedHash()} carries the rehash-on-login path required by LOS-0502: it is present
 * only when the password matched and the stored hash was produced with weaker-than-current
 * parameters, so the caller (the future login use case) can persist it over the old one.
 */
public record PasswordVerification(boolean matched, Optional<String> rehashedHash) {

  public PasswordVerification {
    Objects.requireNonNull(rehashedHash, "rehashedHash must not be null");
    if (!matched && rehashedHash.isPresent()) {
      throw new IllegalArgumentException(
          "rehashedHash must be empty when the password did not match");
    }
  }

  public static PasswordVerification failed() {
    return new PasswordVerification(false, Optional.empty());
  }

  public static PasswordVerification success() {
    return new PasswordVerification(true, Optional.empty());
  }

  public static PasswordVerification matchedWithRehash(String newHash) {
    Objects.requireNonNull(newHash, "newHash must not be null");
    return new PasswordVerification(true, Optional.of(newHash));
  }
}
