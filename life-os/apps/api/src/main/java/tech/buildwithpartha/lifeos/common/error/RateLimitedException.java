package tech.buildwithpartha.lifeos.common.error;

import java.time.Duration;

/**
 * A request rejected because the caller exceeded a rate-limit policy. Always carries {@link
 * StandardErrorCodes#RATE_LIMITED} and maps to HTTP 429 in {@code ApiExceptionHandler}.
 */
public final class RateLimitedException extends CodedException {

  private final Duration retryAfter;

  public RateLimitedException(String message) {
    this(message, null);
  }

  public RateLimitedException(String message, Duration retryAfter) {
    super(StandardErrorCodes.RATE_LIMITED, message);
    this.retryAfter = retryAfter;
  }

  public Duration retryAfter() {
    return retryAfter;
  }

  public long retryAfterSeconds() {
    if (retryAfter == null || retryAfter.isNegative()) {
      return 60L;
    }
    long seconds = retryAfter.toSeconds();
    return seconds > 0 ? seconds : 1L;
  }
}
