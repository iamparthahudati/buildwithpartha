package tech.buildwithpartha.lifeos.common.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class RateLimiterServiceTests {

  @Test
  void allowsRequestsUpToMaxLimitAndCalculatesRemaining() {
    MutableClock clock = new MutableClock(Instant.parse("2026-08-18T10:00:00Z"));
    RateLimiterService service = new RateLimiterService(clock);
    RateLimitPolicy policy =
        new RateLimitPolicy(RateLimitCategory.SEARCH, 3, Duration.ofMinutes(1));

    RateLimitResult res1 = service.tryAcquire("search:127.0.0.1", policy);
    assertThat(res1.allowed()).isTrue();
    assertThat(res1.remaining()).isEqualTo(2);

    RateLimitResult res2 = service.tryAcquire("search:127.0.0.1", policy);
    assertThat(res2.allowed()).isTrue();
    assertThat(res2.remaining()).isEqualTo(1);

    RateLimitResult res3 = service.tryAcquire("search:127.0.0.1", policy);
    assertThat(res3.allowed()).isTrue();
    assertThat(res3.remaining()).isEqualTo(0);

    RateLimitResult res4 = service.tryAcquire("search:127.0.0.1", policy);
    assertThat(res4.allowed()).isFalse();
    assertThat(res4.remaining()).isEqualTo(0);
    assertThat(res4.retryAfter()).isGreaterThanOrEqualTo(Duration.ofSeconds(1));
  }

  @Test
  void resetsQuotaAfterWindowPasses() {
    MutableClock clock = new MutableClock(Instant.parse("2026-08-18T10:00:00Z"));
    RateLimiterService service = new RateLimiterService(clock);
    RateLimitPolicy policy =
        new RateLimitPolicy(RateLimitCategory.EXPORT, 2, Duration.ofMinutes(1));

    service.tryAcquire("export:account-1", policy);
    service.tryAcquire("export:account-1", policy);
    assertThat(service.tryAcquire("export:account-1", policy).allowed()).isFalse();

    clock.advance(Duration.ofSeconds(61));

    RateLimitResult res = service.tryAcquire("export:account-1", policy);
    assertThat(res.allowed()).isTrue();
    assertThat(res.remaining()).isEqualTo(1);
  }

  @Test
  void evictsExpiredWindowsDuringCleanup() {
    MutableClock clock = new MutableClock(Instant.parse("2026-08-18T10:00:00Z"));
    RateLimiterService service = new RateLimiterService(clock);
    RateLimitPolicy policy = new RateLimitPolicy(RateLimitCategory.WRITE, 5, Duration.ofMinutes(1));

    service.tryAcquire("write:ip:1", policy);
    service.tryAcquire("write:ip:2", policy);
    assertThat(service.activeKeyCount()).isEqualTo(2);

    clock.advance(Duration.ofSeconds(61));
    service.cleanupExpiredWindows();

    assertThat(service.activeKeyCount()).isEqualTo(0);
  }

  @Test
  void recordsMicrometerMetrics() {
    MutableClock clock = new MutableClock(Instant.parse("2026-08-18T10:00:00Z"));
    MeterRegistry meterRegistry = new SimpleMeterRegistry();
    RateLimiterService service = new RateLimiterService(clock, meterRegistry);
    RateLimitPolicy policy = new RateLimitPolicy(RateLimitCategory.AUTH, 1, Duration.ofMinutes(5));

    service.tryAcquire("auth:ip:1", policy);
    service.tryAcquire("auth:ip:1", policy);

    double allowedCount =
        meterRegistry
            .get("lifeos.rate_limit.evaluations")
            .tag("category", "auth")
            .tag("result", "allowed")
            .counter()
            .count();

    double rejectedCount =
        meterRegistry
            .get("lifeos.rate_limit.evaluations")
            .tag("category", "auth")
            .tag("result", "rejected")
            .counter()
            .count();

    assertThat(allowedCount).isEqualTo(1.0);
    assertThat(rejectedCount).isEqualTo(1.0);
  }

  private static final class MutableClock extends Clock {

    private Instant instant;

    private MutableClock(Instant instant) {
      this.instant = instant;
    }

    private void advance(Duration duration) {
      instant = instant.plus(duration);
    }

    @Override
    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
      throw new UnsupportedOperationException();
    }

    @Override
    public Instant instant() {
      return instant;
    }
  }
}
