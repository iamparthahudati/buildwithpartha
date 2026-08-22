package tech.buildwithpartha.lifeos.common.job;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Domain-neutral contract for executing a background job of a specific kind (LOS-1403). */
public interface JobHandler {

  /** Simple read context passed to the handler during job execution. */
  record JobContext(
      UUID jobId,
      Optional<UUID> userId,
      BackgroundJobKind kind,
      String payload,
      Instant enqueuedAt) {}

  /**
   * Executes the work associated with the given job context.
   *
   * @param context execution context of the background job
   */
  void execute(JobContext context);
}
