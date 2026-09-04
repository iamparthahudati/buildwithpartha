package tech.buildwithpartha.lifeos.common.ratelimit;

import java.time.Duration;
import java.util.Objects;

/** Policy declaration defining rate-limiting window duration and quota limit per category. */
public record RateLimitPolicy(RateLimitCategory category, int maxRequests, Duration window) {

  public RateLimitPolicy {
    Objects.requireNonNull(category, "category must not be null");
    Objects.requireNonNull(window, "window must not be null");
    if (maxRequests <= 0) {
      throw new IllegalArgumentException("maxRequests must be positive");
    }
    if (window.isNegative() || window.isZero()) {
      throw new IllegalArgumentException("window must be positive duration");
    }
  }

  public static RateLimitPolicy authPolicy() {
    return new RateLimitPolicy(RateLimitCategory.AUTH, 5, Duration.ofMinutes(15));
  }

  public static RateLimitPolicy searchPolicy() {
    return new RateLimitPolicy(RateLimitCategory.SEARCH, 30, Duration.ofMinutes(1));
  }

  public static RateLimitPolicy exportPolicy() {
    return new RateLimitPolicy(RateLimitCategory.EXPORT, 10, Duration.ofMinutes(1));
  }

  public static RateLimitPolicy writePolicy() {
    return new RateLimitPolicy(RateLimitCategory.WRITE, 60, Duration.ofMinutes(1));
  }
}
