package tech.buildwithpartha.lifeos.common.error;

import java.util.Objects;

/**
 * Base type for expected application failures with a stable code.
 *
 * <p>The exception message is for server-side diagnostics and must not be returned directly to a
 * client. The API error mapper introduced by LOS-0213 will translate the code into safe Problem
 * Details.
 */
public abstract class CodedException extends RuntimeException {

  private final ErrorCode code;

  protected CodedException(ErrorCode code, String message) {
    super(Objects.requireNonNull(message, "message must not be null"));
    this.code = Objects.requireNonNull(code, "code must not be null");
  }

  protected CodedException(ErrorCode code, String message, Throwable cause) {
    super(Objects.requireNonNull(message, "message must not be null"), cause);
    this.code = Objects.requireNonNull(code, "code must not be null");
  }

  public final ErrorCode code() {
    return code;
  }
}
