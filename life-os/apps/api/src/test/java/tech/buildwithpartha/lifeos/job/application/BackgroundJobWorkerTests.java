package tech.buildwithpartha.lifeos.job.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJob;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobStatus;
import tech.buildwithpartha.lifeos.job.domain.JobRetryPolicy;

class BackgroundJobWorkerTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");

  private FakeBackgroundJobRepository repository;
  private FakeJobHandler handler;
  private BackgroundJobWorker worker;

  @BeforeEach
  void setUp() {
    repository = new FakeBackgroundJobRepository();
    handler = new FakeJobHandler();
    JobHandlerRegistry registry = new JobHandlerRegistry(List.of(handler));
    worker = new BackgroundJobWorker(repository, registry, Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void pollAndDispatch_executesSuccessfulJob() {
    BackgroundJob job =
        BackgroundJob.enqueue(
            UUID.randomUUID(), UUID.randomUUID(), BackgroundJobKind.DATA_EXPORT, "{}", NOW);
    repository.save(job);

    worker.pollAndDispatch();

    BackgroundJob updated = repository.findById(job.id()).orElseThrow();
    assertThat(updated.status()).isEqualTo(BackgroundJobStatus.SUCCEEDED);
    assertThat(updated.payload()).isEqualTo("{}"); // erased
    assertThat(updated.completedAt()).isPresent();
    assertThat(handler.executedJobs()).hasSize(1);
  }

  @Test
  void pollAndDispatch_onHandlerFailure_retriesJobWithBackoff() {
    handler.failWith(new RuntimeException("transient failure"));
    BackgroundJob job =
        BackgroundJob.enqueue(
            UUID.randomUUID(),
            UUID.randomUUID(),
            BackgroundJobKind.DATA_EXPORT,
            "{\"k\":\"v\"}",
            NOW);
    repository.save(job);

    worker.pollAndDispatch();

    BackgroundJob updated = repository.findById(job.id()).orElseThrow();
    assertThat(updated.status()).isEqualTo(BackgroundJobStatus.PENDING);
    assertThat(updated.attemptCount()).isEqualTo(1);
    assertThat(updated.nextAttemptAt()).isAfter(NOW);
    assertThat(updated.payload()).isEqualTo("{\"k\":\"v\"}"); // NOT erased while retrying
    assertThat(updated.lastErrorClass()).contains("java.lang.RuntimeException");
  }

  @Test
  void pollAndDispatch_exhaustsRetryBudget_deadLetters() {
    handler.failWith(new RuntimeException("permanent failure"));
    BackgroundJob base =
        BackgroundJob.enqueue(
            UUID.randomUUID(),
            UUID.randomUUID(),
            BackgroundJobKind.DATA_EXPORT,
            "{\"k\":\"v\"}",
            NOW);
    // Simulate already failed MAX_ATTEMPTS - 1 times, keeping nextAttemptAt = NOW so it stays due
    BackgroundJob nearExhausted = base;
    JobRetryPolicy policy = new JobRetryPolicy();
    for (int i = 0; i < JobRetryPolicy.MAX_ATTEMPTS - 1; i++) {
      nearExhausted =
          nearExhausted.markRunning(NOW).recordFailure(NOW, "SomeException", policy);
      // Force nextAttemptAt back to NOW so the job stays due for polling
      nearExhausted =
          new BackgroundJob(
              nearExhausted.id(),
              nearExhausted.userId(),
              nearExhausted.kind(),
              nearExhausted.payload(),
              nearExhausted.status(),
              nearExhausted.attemptCount(),
              NOW,
              nearExhausted.lastAttemptAt(),
              nearExhausted.lastErrorClass(),
              nearExhausted.startedAt(),
              nearExhausted.completedAt(),
              nearExhausted.deadLetteredAt(),
              nearExhausted.createdAt(),
              nearExhausted.updatedAt());
    }
    repository.save(nearExhausted);

    worker.pollAndDispatch();

    BackgroundJob updated = repository.findById(base.id()).orElseThrow();
    assertThat(updated.status()).isEqualTo(BackgroundJobStatus.DEAD_LETTERED);
    assertThat(updated.payload()).isEqualTo("{}"); // erased on dead-letter
    assertThat(updated.deadLetteredAt()).isPresent();
  }

  @Test
  void pollAndDispatch_noDueJobs_doesNothing() {
    BackgroundJob future =
        BackgroundJob.enqueue(
            UUID.randomUUID(),
            UUID.randomUUID(),
            BackgroundJobKind.DATA_EXPORT,
            "{}",
            NOW.plusSeconds(3600));
    repository.save(future);

    worker.pollAndDispatch();

    assertThat(handler.executedJobs()).isEmpty();
    assertThat(repository.findById(future.id()).orElseThrow().status())
        .isEqualTo(BackgroundJobStatus.PENDING);
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  @JobHandlerFor(BackgroundJobKind.DATA_EXPORT)
  private static final class FakeJobHandler implements JobHandler {

    private final List<BackgroundJob> executed = new ArrayList<>();
    private RuntimeException failure;

    void failWith(RuntimeException e) {
      this.failure = e;
    }

    @Override
    public void execute(BackgroundJob job) {
      if (failure != null) {
        throw failure;
      }
      executed.add(job);
    }

    List<BackgroundJob> executedJobs() {
      return List.copyOf(executed);
    }
  }
}
