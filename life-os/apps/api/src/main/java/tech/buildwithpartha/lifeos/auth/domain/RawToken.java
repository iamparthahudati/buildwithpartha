package tech.buildwithpartha.lifeos.auth.domain;

import java.util.Objects;

/**
 * A single-use, high-entropy secret in both forms: {@link #value()} as generated (travels only in
 * one outbound email URL) and {@link #hash()} as stored (email verification and, later,
 * password-reset tokens).
 *
 * <p>{@link #toString()} redacts {@link #value()} the same way {@code RawPassword} does, so a log
 * line or assertion failure can print the safe {@link #hash()} without ever risking the secret
 * itself.
 */
public final class RawToken {

  private final String value;
  private final String hash;

  private RawToken(String value, String hash) {
    this.value = value;
    this.hash = hash;
  }

  public static RawToken of(String value, String hash) {
    Objects.requireNonNull(value, "value must not be null");
    Objects.requireNonNull(hash, "hash must not be null");
    if (value.isBlank()) {
      throw new IllegalArgumentException("value must not be blank");
    }
    if (hash.isBlank()) {
      throw new IllegalArgumentException("hash must not be blank");
    }
    return new RawToken(value, hash);
  }

  public String value() {
    return value;
  }

  public String hash() {
    return hash;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof RawToken that)) {
      return false;
    }
    return value.equals(that.value) && hash.equals(that.hash);
  }

  @Override
  public int hashCode() {
    return Objects.hash(value, hash);
  }

  @Override
  public String toString() {
    return "RawToken[REDACTED, hash=" + hash + "]";
  }
}
