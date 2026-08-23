package tech.buildwithpartha.lifeos.audit.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Daily idempotent cleanup for expired R6 Security Audit Events. */
@Component
class SecurityAuditRetentionJob {

  private static final Logger log = LoggerFactory.getLogger(SecurityAuditRetentionJob.class);

  private final SecurityAuditService service;

  SecurityAuditRetentionJob(SecurityAuditService service) {
    this.service = service;
  }

  @Scheduled(cron = "0 0 5 * * *")
  void purgeExpiredEvents() {
    int deleted = service.purgeExpired();
    log.info("security audit retention cleanup deleted={}", deleted);
  }
}
