package tech.buildwithpartha.lifeos.notification.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Daily scheduled job purging clearable notifications older than 90 days (R5 retention, LOS-1303).
 */
@Component
public class NotificationRetentionJob {

  private static final Logger log = LoggerFactory.getLogger(NotificationRetentionJob.class);

  private final NotificationService notificationService;

  public NotificationRetentionJob(NotificationService notificationService) {
    this.notificationService = notificationService;
  }

  @Scheduled(cron = "0 30 4 * * *")
  public void purgeExpiredNotifications() {
    int deleted = notificationService.purgeExpiredNotifications();
    log.info("notification retention cleanup deleted={}", deleted);
  }
}
