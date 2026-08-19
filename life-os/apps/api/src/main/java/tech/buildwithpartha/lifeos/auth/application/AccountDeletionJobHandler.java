package tech.buildwithpartha.lifeos.auth.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.JobHandler;
import tech.buildwithpartha.lifeos.common.job.JobHandlerFor;

/**
 * Background job handler for asynchronous account deletion cleanup (LOS-0518).
 */
@Component
@JobHandlerFor(BackgroundJobKind.ACCOUNT_DELETION)
public class AccountDeletionJobHandler implements JobHandler {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  @Override
  @Transactional
  public void execute(JobContext context) {
    AUDIT_LOGGER.info(
        "event=account_deletion_job_executed jobId={} userId={}",
        context.jobId(),
        context.userId().orElse(null));
  }
}
