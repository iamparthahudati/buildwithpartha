package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.LoginRateLimiter;
import tech.buildwithpartha.lifeos.common.ratelimit.RateLimitCategory;
import tech.buildwithpartha.lifeos.common.ratelimit.RateLimitPolicy;
import tech.buildwithpartha.lifeos.common.ratelimit.RateLimiterService;

/**
 * A fixed-window {@link LoginRateLimiter} delegating rate-limiting policy evaluation, metrics
 * recording, and memory eviction to {@link RateLimiterService}.
 */
@Component
class InMemoryLoginRateLimiter implements LoginRateLimiter {

  static final int MAX_ATTEMPTS_PER_WINDOW = 5;
  static final Duration WINDOW = Duration.ofMinutes(15);
  private static final RateLimitPolicy POLICY =
      new RateLimitPolicy(RateLimitCategory.AUTH, MAX_ATTEMPTS_PER_WINDOW, WINDOW);

  private final RateLimiterService rateLimiterService;

  @Autowired
  InMemoryLoginRateLimiter(RateLimiterService rateLimiterService) {
    this.rateLimiterService = rateLimiterService;
  }

  InMemoryLoginRateLimiter(Clock clock) {
    this(new RateLimiterService(clock));
  }

  @Override
  public boolean tryAcquire(String key) {
    return rateLimiterService.tryAcquire("login:" + key, POLICY).allowed();
  }
}
