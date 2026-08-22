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
import tech.buildwithpartha.lifeos.common.job.JobHandler;
import tech.buildwithpartha.lifeos.common.job.JobHandlerFor;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJob;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobStatus;

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
    assertThat(handler.executedContexts()).hasSize(1);
  }

  @Test
  void pollAndDispatch_whenHandlerThrows_schedulesRetryWithExponentialBackoff() {
    BackgroundJob job =
        BackgroundJob.enqueue(
            UUID.randomUUID(), UUID.randomUUID(), BackgroundJobKind.DATA_EXPORT, "{}", NOW);
    repository.save(job);
    handler.failWith(new IllegalStateException("simulated transient failure"));

    worker.pollAndDispatch();

    BackgroundJob updated = repository.findById(job.id()).orElseThrow();
    assertThat(updated.status()).isEqualTo(BackgroundJobStatus.PENDING);
    assertThat(updated.attemptCount()).isEqualTo(1);
    assertThat(updated.lastErrorClass()).contains("java.lang.IllegalStateException");
    assertThat(updated.nextAttemptAt()).isAfter(NOW);
  }

  @Test
  void pollAndDispatch_exhaustedAttempts_deadLetters() {
    BackgroundJob job =
        new BackgroundJob(
            UUID.randomUUID(),
            java.util.Optional.of(UUID.randomUUID()),
            BackgroundJobKind.DATA_EXPORT,
            "{}",
            BackgroundJobStatus.PENDING,
            9, // will become attempt 10, max attempts is 10
            NOW,
            java.util.Optional.empty(),
            java.util.Optional.empty(),
            java.util.Optional.empty(),
            java.util.Optional.empty(),
            java.util.Optional.empty(),
            NOW,
            NOW);
    repository.save(job);
    handler.failWith(new RuntimeException("fatal"));

    worker.pollAndDispatch();

    BackgroundJob updated = repository.findById(job.id()).orElseThrow();
    assertThat(updated.status()).isEqualTo(BackgroundJobStatus.DEAD_LETTERED);
    assertThat(updated.attemptCount()).isEqualTo(10);
    assertThat(updated.payload()).isEqualTo("{}"); // erased on terminal
  }

  @Test
  void pollAndDispatch_ignoresFutureJobs() {
    Instant futureTime = NOW.plusSeconds(3600);
    BackgroundJob future =
        BackgroundJob.enqueue(
            UUID.randomUUID(), UUID.randomUUID(), BackgroundJobKind.DATA_EXPORT, "{}", futureTime);
    repository.save(future);

    worker.pollAndDispatch();

    assertThat(handler.executedContexts()).isEmpty();
    assertThat(repository.findById(future.id()).orElseThrow().status())
        .isEqualTo(BackgroundJobStatus.PENDING);
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  @JobHandlerFor(BackgroundJobKind.DATA_EXPORT)
  private static final class FakeJobHandler implements JobHandler {

    private final List<JobContext> executed = new ArrayList<>();
    private RuntimeException failure;

    void failWith(RuntimeException e) {
      this.failure = e;
    }

    @Override
    public void execute(JobContext context) {
      if (failure != null) {
        throw failure;
      }
      executed.add(context);
    }

    List<JobContext> executedContexts() {
      return List.copyOf(executed);
    }
  }
}
