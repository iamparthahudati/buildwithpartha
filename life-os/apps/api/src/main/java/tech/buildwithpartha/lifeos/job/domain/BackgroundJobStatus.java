package tech.buildwithpartha.lifeos.job.domain;

/**
 * Lifecycle status of a {@link BackgroundJob}. Terminal states are {@code SUCCEEDED} and {@code
 * DEAD_LETTERED}; both erase the payload to protect any user data in the JSON input.
 */
public enum BackgroundJobStatus {
  /** Waiting to be picked up by the worker (including retry-waiting). */
  PENDING,

  /** Currently being executed by the worker. */
  RUNNING,

  /** Completed successfully. Payload has been erased. */
  SUCCEEDED,

  /** A failed attempt that will not be retried (budget not yet exhausted — internal use). */
  FAILED,

  /** Retry budget exhausted. Payload has been erased. */
  DEAD_LETTERED
}
