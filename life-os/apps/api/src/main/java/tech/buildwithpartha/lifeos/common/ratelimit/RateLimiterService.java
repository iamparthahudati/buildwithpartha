package tech.buildwithpartha.lifeos.common.ratelimit;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Thread-safe rate limiter service backed by fixed-window counters, periodic memory eviction, and
 * Micrometer observability counters.
 */
@Service
public class RateLimiterService {

  private final Clock clock;
  private final MeterRegistry meterRegistry;
  private final ConcurrentHashMap<String, WindowState> windows = new ConcurrentHashMap<>();

  @Autowired
  public RateLimiterService(Clock clock, @Autowired(required = false) MeterRegistry meterRegistry) {
    this.clock = clock;
    this.meterRegistry = meterRegistry;
  }

  public RateLimiterService(Clock clock) {
    this(clock, null);
  }

  public RateLimitResult tryAcquire(String key, RateLimitPolicy policy) {
    Instant now = clock.instant();

    WindowState updated =
        windows.compute(
            key,
            (k, existing) ->
                existing == null || existing.expiresAt().isBefore(now)
                    ? new WindowState(now.plus(policy.window()), 1)
                    : new WindowState(existing.expiresAt(), existing.count() + 1));

    boolean allowed = updated.count() <= policy.maxRequests();
    recordMetric(policy.category(), allowed);

    if (allowed) {
      int remaining = Math.max(0, policy.maxRequests() - updated.count());
      return RateLimitResult.allow(policy.maxRequests(), remaining);
    } else {
      Duration retryAfter = Duration.between(now, updated.expiresAt());
      if (retryAfter.isNegative() || retryAfter.isZero()) {
        retryAfter = Duration.ofSeconds(1);
      }
      return RateLimitResult.deny(policy.maxRequests(), retryAfter);
    }
  }

  @Scheduled(fixedDelay = 60000)
  public void cleanupExpiredWindows() {
    Instant now = clock.instant();
    windows.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
  }

  public int activeKeyCount() {
    return windows.size();
  }

  public void resetAll() {
    windows.clear();
  }

  private void recordMetric(RateLimitCategory category, boolean allowed) {
    if (meterRegistry != null) {
      Counter.builder("lifeos.rate_limit.evaluations")
          .tag("category", category.label())
          .tag("result", allowed ? "allowed" : "rejected")
          .register(meterRegistry)
          .increment();
    }
  }

  private record WindowState(Instant expiresAt, int count) {}
}
