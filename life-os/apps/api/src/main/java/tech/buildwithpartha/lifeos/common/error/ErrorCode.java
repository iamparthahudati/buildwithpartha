package tech.buildwithpartha.lifeos.common.error;

import java.util.Objects;
import java.util.regex.Pattern;

/** A stable machine-readable error identifier shared across backend boundaries. */
public record ErrorCode(String value) {

  private static final Pattern FORMAT = Pattern.compile("[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*");

  public ErrorCode {
    Objects.requireNonNull(value, "value must not be null");
    if (!FORMAT.matcher(value).matches()) {
      throw new IllegalArgumentException(
          "value must use upper snake case, for example TASK_NOT_FOUND");
    }
  }

  public static ErrorCode of(String value) {
    return new ErrorCode(value);
  }

  @Override
  public String toString() {
    return value;
  }
}
