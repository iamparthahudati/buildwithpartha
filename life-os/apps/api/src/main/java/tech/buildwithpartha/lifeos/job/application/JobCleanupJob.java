package tech.buildwithpartha.lifeos.job.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobRepository;

/**
 * Purges terminal ({@code SUCCEEDED}/{@code DEAD_LETTERED}) background job rows older than 7 days,
 * matching retention class R1 ({@code 31-PRIVACY-DATA-LIFECYCLE.md}). Runs once daily at 03:45
 * (offset from the outbox cleanup at 03:30 to avoid concurrent load). The delete is idempotent, so
 * a missed or overlapping run is harmless. Payload was already erased on terminal transition.
 */
@Component
class JobCleanupJob {

  private static final Logger log = LoggerFactory.getLogger(JobCleanupJob.class);
  private static final Duration RETENTION = Duration.ofDays(7);

  private final BackgroundJobRepository repository;
  private final Clock clock;

  JobCleanupJob(BackgroundJobRepository repository, Clock clock) {
    this.repository = repository;
    this.clock = clock;
  }

  @Scheduled(cron = "0 45 3 * * *")
  void purgeExpiredTerminalJobs() {
    Instant cutoff = clock.instant().minus(RETENTION);
    int deleted = repository.deleteTerminalOlderThan(cutoff);
    log.info("job cleanup deleted={} cutoff={}", deleted, cutoff);
  }
}
