package tech.buildwithpartha.lifeos.job.application;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJob;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobRepository;
import tech.buildwithpartha.lifeos.job.domain.JobRetryPolicy;

/**
 * Polls for due {@link BackgroundJob}s and dispatches them to registered {@link JobHandler}s.
 *
 * <p>The deployment is a single backend instance ({@code 02-ARCHITECTURE.md}), so row-level
 * leasing via {@code FOR UPDATE SKIP LOCKED} is included for correctness but not strictly required.
 * {@link Scheduled#fixedDelay()} (not {@code fixedRate}) guarantees one poll always finishes before
 * the next starts.
 *
 * <p>Log lines never include payload content or raw exception messages — only the job id, kind,
 * status, attempt count, and a sanitized failure class name ({@code 06-SECURITY.md}).
 */
@Component
class BackgroundJobWorker {

  private static final Logger log = LoggerFactory.getLogger(BackgroundJobWorker.class);
  private static final int BATCH_SIZE = 5;

  private final BackgroundJobRepository repository;
  private final JobHandlerRegistry handlerRegistry;
  private final Clock clock;
  private final JobRetryPolicy retryPolicy;

  BackgroundJobWorker(
      BackgroundJobRepository repository, JobHandlerRegistry handlerRegistry, Clock clock) {
    this.repository = repository;
    this.handlerRegistry = handlerRegistry;
    this.clock = clock;
    this.retryPolicy = new JobRetryPolicy();
  }

  @Scheduled(fixedDelay = 30_000)
  void pollAndDispatch() {
    Instant now = clock.instant();
    List<BackgroundJob> due = repository.findDuePending(now, BATCH_SIZE);
    for (BackgroundJob job : due) {
      executeOne(job, now);
    }
  }

  private void executeOne(BackgroundJob job, Instant now) {
    BackgroundJob running = repository.save(job.markRunning(now));
    log.info(
        "job started id={} kind={} attempt={}",
        running.id(),
        running.kind(),
        running.attemptCount());

    try {
      JobHandler handler = handlerRegistry.handlerFor(job.kind());
      handler.execute(running);
      BackgroundJob succeeded = repository.save(running.recordSuccess(clock.instant()));
      log.info(
          "job succeeded id={} kind={} attempt={}",
          succeeded.id(),
          succeeded.kind(),
          succeeded.attemptCount());
    } catch (RuntimeException e) {
      String sanitizedErrorClass = rootCauseClassName(e);
      BackgroundJob updated =
          repository.save(running.recordFailure(clock.instant(), sanitizedErrorClass, retryPolicy));
      log.warn(
          "job {} id={} kind={} attempt={} errorClass={}",
          updated.isTerminal() ? "dead-lettered" : "will-retry",
          updated.id(),
          updated.kind(),
          updated.attemptCount(),
          sanitizedErrorClass);
    }
  }

  private static String rootCauseClassName(Throwable failure) {
    Throwable cause = failure;
    while (cause.getCause() != null && cause.getCause() != cause) {
      cause = cause.getCause();
    }
    return cause.getClass().getName();
  }
}
