package tech.buildwithpartha.lifeos.job.domain;

import java.time.Duration;

/**
 * Exponential-backoff retry policy for background jobs (LOS-1403).
 *
 * <p>The schedule is 1m, 2m, 4m, 8m, 16m, 30m (capped), 30m, 30m, 30m, 30m — dead-lettered on the
 * 10th attempt (roughly 2.5 hours from first failure). Jobs are slower and more complex than mail
 * delivery, so the base delay and budget are larger than {@code notification.domain.RetryPolicy}.
 */
public final class JobRetryPolicy {

  public static final Duration BASE_DELAY = Duration.ofMinutes(1);
  public static final double BACKOFF_MULTIPLIER = 2.0;
  public static final Duration MAX_DELAY = Duration.ofMinutes(30);
  public static final int MAX_ATTEMPTS = 10;

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
   * @return true once the retry budget is exhausted and the job should be dead-lettered
   */
  public boolean isExhausted(int attemptCount) {
    return attemptCount >= MAX_ATTEMPTS;
  }
}
