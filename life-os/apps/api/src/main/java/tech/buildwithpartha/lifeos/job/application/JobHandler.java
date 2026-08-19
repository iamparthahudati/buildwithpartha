package tech.buildwithpartha.lifeos.job.application;

import tech.buildwithpartha.lifeos.job.domain.BackgroundJob;

/**
 * Strategy interface executed by the background job worker for one specific {@link
 * tech.buildwithpartha.lifeos.common.job.BackgroundJobKind}.
 *
 * <p>Implementations must:
 * <ul>
 *   <li>Be idempotent — the same job may be executed more than once after a worker restart.
 *   <li>Open their own {@code @Transactional} scope (the worker saves state changes in a separate
 *       transaction after the handler returns).
 *   <li>Throw any {@link RuntimeException} to signal failure; the worker applies the retry policy.
 * </ul>
 */
public interface JobHandler {

  /**
   * Executes the job.
   *
   * @param job the job to execute; {@code job.payload()} contains JSON-encoded input
   * @throws RuntimeException on any unrecoverable or transient failure
   */
  void execute(BackgroundJob job);
}
