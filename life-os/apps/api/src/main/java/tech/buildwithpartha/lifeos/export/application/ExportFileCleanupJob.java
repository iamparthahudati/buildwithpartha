package tech.buildwithpartha.lifeos.export.application;

import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled cleanup job expiring overdue export files and purging old terminal records (LOS-1405).
 *
 * <p>Enforces R1 retention class (purge expired records within 7 days, {@code
 * 31-PRIVACY-DATA-LIFECYCLE.md}).
 */
@Component
public class ExportFileCleanupJob {

  private static final Logger log = LoggerFactory.getLogger(ExportFileCleanupJob.class);
  private static final Duration RETENTION = Duration.ofDays(7);

  private final ExportFileService exportFileService;

  public ExportFileCleanupJob(ExportFileService exportFileService) {
    this.exportFileService = exportFileService;
  }

  @Scheduled(cron = "0 0 4 * * *")
  public void runDailyCleanup() {
    int expiredCount = exportFileService.expireOverdueExports();
    int purgedCount = exportFileService.purgeOldTerminalRecords(RETENTION);
    log.info(
        "export cleanup completed: expiredOverdue={} purgedTerminal={}", expiredCount, purgedCount);
  }
}
