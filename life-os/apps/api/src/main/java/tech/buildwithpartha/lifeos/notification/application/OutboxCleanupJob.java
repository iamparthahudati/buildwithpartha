package tech.buildwithpartha.lifeos.notification.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.notification.domain.OutboxRepository;

/**
 * Purges terminal ({@code SENT}/{@code DEAD_LETTERED}) outbox rows older than 7 days, matching
 * retention class R1 ("short-lived secret/job... purge expired/consumed records within 7 days",
 * {@code 31-PRIVACY-DATA-LIFECYCLE.md}). Runs once daily; the delete is idempotent, so a missed or
 * overlapping run is harmless.
 */
@Component
class OutboxCleanupJob {

  private static final Logger log = LoggerFactory.getLogger(OutboxCleanupJob.class);
  private static final Duration RETENTION = Duration.ofDays(7);

  private final OutboxRepository outboxRepository;
  private final Clock clock;

  OutboxCleanupJob(OutboxRepository outboxRepository, Clock clock) {
    this.outboxRepository = outboxRepository;
    this.clock = clock;
  }

  @Scheduled(cron = "0 30 3 * * *")
  void purgeExpiredTerminalMessages() {
    Instant cutoff = clock.instant().minus(RETENTION);
    int deleted = outboxRepository.deleteTerminalOlderThan(cutoff);
    log.info("outbox cleanup deleted={} cutoff={}", deleted, cutoff);
  }
}
