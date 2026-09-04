package tech.buildwithpartha.lifeos.common.ratelimit;

import java.time.Duration;

/** Outcome of a rate limit acquisition evaluation. */
public record RateLimitResult(
    boolean allowed, int maxRequests, int remaining, Duration retryAfter) {

  public static RateLimitResult allow(int maxRequests, int remaining) {
    return new RateLimitResult(true, maxRequests, remaining, Duration.ZERO);
  }

  public static RateLimitResult deny(int maxRequests, Duration retryAfter) {
    return new RateLimitResult(false, maxRequests, 0, retryAfter);
  }
}
