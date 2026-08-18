package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.LoginRateLimiter;

/**
 * A fixed-window, in-memory {@link LoginRateLimiter}, the same shape {@link
 * InMemorySignupRateLimiter} already established for signup: at most {@link
 * #MAX_ATTEMPTS_PER_WINDOW} calls per key inside a rolling {@link #WINDOW}, correct for exactly one
 * deployment instance ({@code 02-ARCHITECTURE.md}). See {@link InMemorySignupRateLimiter}'s own
 * Javadoc for the known eviction limitation, which applies here identically.
 */
@Component
class InMemoryLoginRateLimiter implements LoginRateLimiter {

  static final int MAX_ATTEMPTS_PER_WINDOW = 5;
  static final Duration WINDOW = Duration.ofMinutes(15);

  private final Clock clock;
  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

  InMemoryLoginRateLimiter(Clock clock) {
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
