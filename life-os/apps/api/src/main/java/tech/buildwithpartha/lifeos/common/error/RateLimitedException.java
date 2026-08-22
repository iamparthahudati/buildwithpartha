package tech.buildwithpartha.lifeos.common.error;

/**
 * A request rejected because the caller exceeded a rate-limit policy. Always carries {@link
 * StandardErrorCodes#RATE_LIMITED} and maps to HTTP 429 in {@code ApiExceptionHandler}.
 *
 * <p>This is a self-contained, per-endpoint limiter's failure (for example {@code
 * auth.application.SignupService}'s signup limiter), not yet the general policy/metrics
 * infrastructure {@code LOS-1401} will introduce; that ticket may want a richer type carrying a
 * retry-after hint.
 */
public final class RateLimitedException extends CodedException {

  public RateLimitedException(String message) {
    super(StandardErrorCodes.RATE_LIMITED, message);
  }
}
