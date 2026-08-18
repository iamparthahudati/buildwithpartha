package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.SignupRateLimiter;

/**
 * A fixed-window, in-memory {@link SignupRateLimiter}: at most {@link #MAX_ATTEMPTS_PER_WINDOW}
 * calls per key inside a rolling {@link #WINDOW}, backed by a plain {@link ConcurrentHashMap}. This
 * is correct for exactly one deployment instance ({@code 02-ARCHITECTURE.md}: one VPS, one Spring
 * Boot service), the same single-instance assumption {@code notification.application
 * .MailDispatchWorker} already relies on.
 *
 * <p>Known limitation: keys are never actively evicted once their window has passed, only
 * overwritten the next time the same key is used, so long-lived process memory grows with the
 * number of distinct callers ever seen. At this product's expected signup volume that is not a
 * practical concern; {@code LOS-1401}'s general rate-limit framework is expected to replace this
 * adapter entirely rather than have it grow a cleanup job of its own.
 */
@Component
class InMemorySignupRateLimiter implements SignupRateLimiter {

  static final int MAX_ATTEMPTS_PER_WINDOW = 5;
  static final Duration WINDOW = Duration.ofMinutes(15);

  private final Clock clock;
  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

  InMemorySignupRateLimiter(Clock clock) {
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
