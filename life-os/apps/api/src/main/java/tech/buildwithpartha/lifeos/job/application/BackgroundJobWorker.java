package tech.buildwithpartha.lifeos.job.application;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.job.JobHandler;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJob;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobRepository;
import tech.buildwithpartha.lifeos.job.domain.JobRetryPolicy;

/**
 * Polls for due {@link BackgroundJob}s and dispatches them to registered {@link JobHandler}s.
 * Scheduled worker that polls due pending {@link BackgroundJob}s, executes their registered
 * handlers, applies exponential backoff on transient failures, and dead-letters on exhaustion.
 */
@Component
public class BackgroundJobWorker {

  private static final Logger log = LoggerFactory.getLogger(BackgroundJobWorker.class);
  private static final int BATCH_SIZE = 10;

  private final BackgroundJobRepository repository;
  private final JobHandlerRegistry handlerRegistry;
  private final JobRetryPolicy retryPolicy;
  private final Clock clock;

  @Autowired
  public BackgroundJobWorker(
      BackgroundJobRepository repository, JobHandlerRegistry handlerRegistry, Clock clock) {
    this(repository, handlerRegistry, new JobRetryPolicy(), clock);
  }

  BackgroundJobWorker(
      BackgroundJobRepository repository,
      JobHandlerRegistry handlerRegistry,
      JobRetryPolicy retryPolicy,
      Clock clock) {
    this.repository = repository;
    this.handlerRegistry = handlerRegistry;
    this.retryPolicy = retryPolicy;
    this.clock = clock;
  }

  /** Polls due pending jobs every 30 seconds. */
  @Scheduled(fixedDelay = 30_000)
  public void runWorker() {
    pollAndDispatch();
  }

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
      handler.execute(
          new JobHandler.JobContext(
              running.id(),
              running.userId(),
              running.kind(),
              running.payload(),
              running.createdAt()));
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
