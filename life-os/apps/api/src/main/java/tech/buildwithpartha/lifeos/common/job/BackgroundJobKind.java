package tech.buildwithpartha.lifeos.common.job;

/**
 * The kind of background job to execute. Each value maps to exactly one {@code
 * job.application.JobHandler} implementation registered in the {@code JobHandlerRegistry}.
 */
public enum BackgroundJobKind {
  /** Assembles and stores a full data export archive for a user (LOS-0517). */
  DATA_EXPORT,

  /** Executes the full account deletion lifecycle for a user (LOS-0518). */
  ACCOUNT_DELETION
}
