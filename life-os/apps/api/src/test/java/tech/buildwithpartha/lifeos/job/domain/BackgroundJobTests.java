package tech.buildwithpartha.lifeos.job.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;

class BackgroundJobTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final Instant LATER = NOW.plusSeconds(60);

  private static BackgroundJob newJob() {
    return BackgroundJob.enqueue(
        UUID.randomUUID(),
        UUID.randomUUID(),
        BackgroundJobKind.DATA_EXPORT,
        "{\"key\":\"value\"}",
        NOW);
  }

  @Test
  void enqueue_createsPendingJobWithPayload() {
    BackgroundJob job = newJob();
    assertThat(job.status()).isEqualTo(BackgroundJobStatus.PENDING);
    assertThat(job.attemptCount()).isZero();
    assertThat(job.payload()).isEqualTo("{\"key\":\"value\"}");
    assertThat(job.isTerminal()).isFalse();
    assertThat(job.startedAt()).isEmpty();
    assertThat(job.completedAt()).isEmpty();
    assertThat(job.deadLetteredAt()).isEmpty();
  }

  @Test
  void markRunning_transitionsToPending() {
    BackgroundJob running = newJob().markRunning(LATER);
    assertThat(running.status()).isEqualTo(BackgroundJobStatus.RUNNING);
    assertThat(running.startedAt()).contains(LATER);
    assertThat(running.updatedAt()).isEqualTo(LATER);
    assertThat(running.payload()).isEqualTo("{\"key\":\"value\"}"); // still present
  }

  @Test
  void recordSuccess_movesToSucceededAndErasesPayload() {
    BackgroundJob succeeded = newJob().markRunning(NOW).recordSuccess(LATER);
    assertThat(succeeded.status()).isEqualTo(BackgroundJobStatus.SUCCEEDED);
    assertThat(succeeded.payload()).isEqualTo("{}");
    assertThat(succeeded.completedAt()).contains(LATER);
    assertThat(succeeded.isTerminal()).isTrue();
  }

  @Test
  void recordFailure_withinBudget_retriesWithBackoff() {
    JobRetryPolicy policy = new JobRetryPolicy();
    BackgroundJob retrying =
        newJob().markRunning(NOW).recordFailure(LATER, "SomeException", policy);
    assertThat(retrying.status()).isEqualTo(BackgroundJobStatus.PENDING);
    assertThat(retrying.attemptCount()).isEqualTo(1);
    assertThat(retrying.nextAttemptAt()).isAfter(LATER);
    assertThat(retrying.payload()).isEqualTo("{\"key\":\"value\"}"); // NOT erased
    assertThat(retrying.lastErrorClass()).contains("SomeException");
    assertThat(retrying.isTerminal()).isFalse();
  }

  @Test
  void recordFailure_budgetExhausted_deadLettersAndErasesPayload() {
    JobRetryPolicy policy = new JobRetryPolicy();
    BackgroundJob job = newJob();
    // Exhaust the retry budget
    for (int i = 0; i < JobRetryPolicy.MAX_ATTEMPTS - 1; i++) {
      job = job.markRunning(NOW).recordFailure(NOW, "SomeException", policy);
    }
    BackgroundJob deadLettered =
        job.markRunning(NOW).recordFailure(LATER, "FinalException", policy);
    assertThat(deadLettered.status()).isEqualTo(BackgroundJobStatus.DEAD_LETTERED);
    assertThat(deadLettered.payload()).isEqualTo("{}");
    assertThat(deadLettered.deadLetteredAt()).contains(LATER);
    assertThat(deadLettered.isTerminal()).isTrue();
  }

  @Test
  void retryPolicy_delayIncreasesExponentially() {
    JobRetryPolicy policy = new JobRetryPolicy();
    assertThat(policy.delayFor(1)).isEqualTo(JobRetryPolicy.BASE_DELAY);
    assertThat(policy.delayFor(2)).isGreaterThan(policy.delayFor(1));
    assertThat(policy.delayFor(10)).isEqualTo(JobRetryPolicy.MAX_DELAY);
  }

  @Test
  void retryPolicy_isExhausted_trueAtMaxAttempts() {
    JobRetryPolicy policy = new JobRetryPolicy();
    assertThat(policy.isExhausted(JobRetryPolicy.MAX_ATTEMPTS - 1)).isFalse();
    assertThat(policy.isExhausted(JobRetryPolicy.MAX_ATTEMPTS)).isTrue();
  }

  @Test
  void retryPolicy_delayFor_throwsOnZero() {
    assertThatThrownBy(() -> new JobRetryPolicy().delayFor(0))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void enqueue_rejectsNegativeAttemptCount() {
    assertThatThrownBy(
            () ->
                new BackgroundJob(
                    UUID.randomUUID(),
                    Optional.of(UUID.randomUUID()),
                    BackgroundJobKind.DATA_EXPORT,
                    "{}",
                    BackgroundJobStatus.PENDING,
                    -1,
                    NOW,
                    Optional.empty(),
                    Optional.empty(),
                    Optional.empty(),
                    Optional.empty(),
                    Optional.empty(),
                    NOW,
                    NOW))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("attemptCount");
  }
}
