package tech.buildwithpartha.lifeos.notification.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class RetryPolicyTests {

  private final RetryPolicy policy = new RetryPolicy();

  @Test
  void followsTheExponentialBackoffScheduleUpToTheCap() {
    assertThat(policy.delayFor(1)).isEqualTo(Duration.ofSeconds(30));
    assertThat(policy.delayFor(2)).isEqualTo(Duration.ofSeconds(60));
    assertThat(policy.delayFor(3)).isEqualTo(Duration.ofMinutes(2));
    assertThat(policy.delayFor(4)).isEqualTo(Duration.ofMinutes(4));
    assertThat(policy.delayFor(5)).isEqualTo(Duration.ofMinutes(8));
    assertThat(policy.delayFor(6)).isEqualTo(Duration.ofMinutes(16));
  }

  @Test
  void capsTheDelayAtMaxDelay() {
    assertThat(policy.delayFor(7)).isEqualTo(Duration.ofMinutes(30));
    assertThat(policy.delayFor(20)).isEqualTo(Duration.ofMinutes(30));
  }

  @Test
  void rejectsAnAttemptCountBelowOne() {
    assertThatThrownBy(() -> policy.delayFor(0)).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void isNotExhaustedBeforeMaxAttempts() {
    assertThat(policy.isExhausted(RetryPolicy.MAX_ATTEMPTS - 1)).isFalse();
  }

  @Test
  void isExhaustedAtMaxAttempts() {
    assertThat(policy.isExhausted(RetryPolicy.MAX_ATTEMPTS)).isTrue();
  }

  @Test
  void isExhaustedBeyondMaxAttempts() {
    assertThat(policy.isExhausted(RetryPolicy.MAX_ATTEMPTS + 1)).isTrue();
  }
}
