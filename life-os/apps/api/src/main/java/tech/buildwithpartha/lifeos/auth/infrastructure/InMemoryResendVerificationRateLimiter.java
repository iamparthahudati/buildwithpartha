package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.ResendVerificationRateLimiter;

/**
 * A fixed-window, in-memory {@link ResendVerificationRateLimiter}, the same shape {@link
 * InMemorySignupRateLimiter}/{@link InMemoryPasswordResetRateLimiter} already established.
 */
@Component
class InMemoryResendVerificationRateLimiter implements ResendVerificationRateLimiter {

  static final int MAX_ATTEMPTS_PER_WINDOW = 5;
  static final Duration WINDOW = Duration.ofMinutes(15);

  private final Clock clock;
  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

  InMemoryResendVerificationRateLimiter(Clock clock) {
    this.clock = clock;
  }

  @Override
  public boolean tryAcquire(String key) {
    Instant now = clock.instant();
    Window updated =
        windows.compute(
            key,
            (ignoredKey, existing) ->
                existing == null || existing.expiresAt().isBefore(now)
                    ? new Window(now.plus(WINDOW), 1)
                    : new Window(existing.expiresAt(), existing.count() + 1));
    return updated.count() <= MAX_ATTEMPTS_PER_WINDOW;
  }

  private record Window(Instant expiresAt, int count) {}
}
