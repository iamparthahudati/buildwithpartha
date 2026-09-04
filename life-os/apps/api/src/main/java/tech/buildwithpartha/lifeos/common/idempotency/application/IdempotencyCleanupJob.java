package tech.buildwithpartha.lifeos.common.idempotency.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Scheduled job purging expired generic idempotency records after seven days. */
@Component
public class IdempotencyCleanupJob {

  private static final Logger log = LoggerFactory.getLogger(IdempotencyCleanupJob.class);

  private final IdempotencyService idempotencyService;

  public IdempotencyCleanupJob(IdempotencyService idempotencyService) {
    this.idempotencyService = idempotencyService;
  }

  @Scheduled(cron = "0 30 3 * * *", zone = "UTC")
  @Transactional
  public void purgeExpiredRecords() {
    int deletedCount = idempotencyService.purgeExpired();
    if (deletedCount > 0) {
      log.info("Purged {} expired idempotency records", deletedCount);
    }
  }
}
