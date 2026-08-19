package tech.buildwithpartha.lifeos.job.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Persistence port for {@link BackgroundJob}. Implemented in {@code job.infrastructure}. */
public interface BackgroundJobRepository {

  /** Inserts a new job or persists the result of a state transition. */
  BackgroundJob save(BackgroundJob job);

  /** Finds a job by its id. */
  Optional<BackgroundJob> findById(UUID id);

  /**
   * Returns up to {@code limit} PENDING jobs whose {@code nextAttemptAt} is at or before {@code
   * now}, ordered oldest-first. Uses {@code FOR UPDATE SKIP LOCKED} for multi-instance safety.
   */
  List<BackgroundJob> findDuePending(Instant now, int limit);

  /**
   * Deletes terminal ({@link BackgroundJobStatus#SUCCEEDED} or {@link
   * BackgroundJobStatus#DEAD_LETTERED}) rows last updated before {@code cutoff} (retention class
   * R1, {@code 31-PRIVACY-DATA-LIFECYCLE.md}).
   *
   * @return the number of rows deleted
   */
  int deleteTerminalOlderThan(Instant cutoff);
}
