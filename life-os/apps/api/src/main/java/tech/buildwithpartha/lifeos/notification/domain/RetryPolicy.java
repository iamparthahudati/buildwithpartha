package tech.buildwithpartha.lifeos.notification.domain;

import java.time.Duration;

/**
 * Exponential backoff and dead-letter threshold for outbox mail delivery attempts.
 *
 * <p>Verification/reset/security mail is time-sensitive, so the first retry fires quickly; the
 * delay then doubles and is capped so a longer SMTP outage isn't hammered. The schedule is 30s,
 * 60s, 2m, 4m, 8m, 16m, 30m (capped), then dead-letter on the 8th attempt — roughly one hour from
 * first failure to dead-lettering. No jitter: this project runs a single low-volume backend
 * instance, so there is no thundering-herd risk to guard against.
 */
public final class RetryPolicy {

  public static final Duration BASE_DELAY = Duration.ofSeconds(30);
  public static final double BACKOFF_MULTIPLIER = 2.0;
  public static final Duration MAX_DELAY = Duration.ofMinutes(30);
  public static final int MAX_ATTEMPTS = 8;

  /**
   * @param attemptCount the attempt count immediately after the failure just recorded (1-based)
   * @return how long to wait before the next attempt, capped at {@link #MAX_DELAY}
   */
  public Duration delayFor(int attemptCount) {
    if (attemptCount < 1) {
      throw new IllegalArgumentException("attemptCount must be at least 1");
    }
    double rawMillis = BASE_DELAY.toMillis() * Math.pow(BACKOFF_MULTIPLIER, attemptCount - 1);
    long cappedMillis = Math.min((long) rawMillis, MAX_DELAY.toMillis());
    return Duration.ofMillis(cappedMillis);
  }

  /**
   * @param attemptCount the attempt count immediately after the failure just recorded
   * @return true once the retry budget is exhausted and the message should be dead-lettered
   */
  public boolean isExhausted(int attemptCount) {
    return attemptCount >= MAX_ATTEMPTS;
  }
}
