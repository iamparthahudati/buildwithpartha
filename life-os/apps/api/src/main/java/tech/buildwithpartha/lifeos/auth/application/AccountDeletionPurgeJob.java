package tech.buildwithpartha.lifeos.auth.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled daily sweep purging accounts whose deletion grace period has elapsed uncancelled
 * (LOS-0518).
 */
@Component
class AccountDeletionPurgeJob {

  private static final Logger log = LoggerFactory.getLogger(AccountDeletionPurgeJob.class);

  private final AccountDeletionPurgeService purgeService;

  AccountDeletionPurgeJob(AccountDeletionPurgeService purgeService) {
    this.purgeService = purgeService;
  }

  @Scheduled(cron = "0 30 4 * * *")
  void runDailyPurge() {
    int purged = purgeService.purgeDueAccounts();
    log.info("account deletion purge completed: purged={}", purged);
  }
}
