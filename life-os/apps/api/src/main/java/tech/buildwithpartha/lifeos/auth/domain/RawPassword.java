package tech.buildwithpartha.lifeos.auth.domain;

import java.util.Objects;

/**
 * A password as the user typed it, held only long enough to validate and hash it.
 *
 * <p>{@link #toString()} is deliberately redacted so that logging, assertion failures, or an
 * exception message that includes this object can never reveal the plaintext value. Callers must
 * still avoid passing {@link #value()} itself to a logger.
 */
public final class RawPassword {

  private final String value;

  private RawPassword(String value) {
    this.value = value;
  }

  public static RawPassword of(String value) {
    Objects.requireNonNull(value, "value must not be null");
    return new RawPassword(value);
  }

  public String value() {
    return value;
  }

  public int length() {
    return value.length();
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof RawPassword that)) {
      return false;
    }
    return value.equals(that.value);
  }

  @Override
  public int hashCode() {
    return value.hashCode();
  }

  @Override
  public String toString() {
    return "RawPassword[REDACTED]";
  }
}
