package tech.buildwithpartha.lifeos.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class InMemorySignupRateLimiterTests {

  @Test
  void allowsUpToTheLimitThenRejectsWithinTheSameWindow() {
    MutableClock clock = new MutableClock(Instant.parse("2026-08-18T00:00:00Z"));
    InMemorySignupRateLimiter limiter = new InMemorySignupRateLimiter(clock);

    for (int attempt = 1; attempt <= InMemorySignupRateLimiter.MAX_ATTEMPTS_PER_WINDOW; attempt++) {
      assertThat(limiter.tryAcquire("203.0.113.1")).as("attempt %d", attempt).isTrue();
    }

    assertThat(limiter.tryAcquire("203.0.113.1")).isFalse();
  }

  @Test
  void tracksEachKeyIndependently() {
    MutableClock clock = new MutableClock(Instant.parse("2026-08-18T00:00:00Z"));
    InMemorySignupRateLimiter limiter = new InMemorySignupRateLimiter(clock);
    for (int attempt = 1; attempt <= InMemorySignupRateLimiter.MAX_ATTEMPTS_PER_WINDOW; attempt++) {
      limiter.tryAcquire("203.0.113.1");
    }

    assertThat(limiter.tryAcquire("198.51.100.1")).isTrue();
  }

  @Test
  void resetsAfterTheWindowElapses() {
    MutableClock clock = new MutableClock(Instant.parse("2026-08-18T00:00:00Z"));
    InMemorySignupRateLimiter limiter = new InMemorySignupRateLimiter(clock);
    for (int attempt = 1; attempt <= InMemorySignupRateLimiter.MAX_ATTEMPTS_PER_WINDOW; attempt++) {
      limiter.tryAcquire("203.0.113.1");
    }
    assertThat(limiter.tryAcquire("203.0.113.1")).isFalse();

    clock.advance(InMemorySignupRateLimiter.WINDOW.plusSeconds(1));

    assertThat(limiter.tryAcquire("203.0.113.1")).isTrue();
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
