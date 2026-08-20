package tech.buildwithpartha.lifeos.common.job;

import java.util.UUID;

/**
 * Transactionally enqueues a background job (LOS-1403).
 *
 * <p>An implementation must join the caller's ambient transaction (default {@code REQUIRED}
 * propagation) so the enqueued job row commits or rolls back atomically with the caller's own write
 * — the same transactional guarantee the outbox mail port ({@code
 * common.mail.TransactionalMailPort}) provides. Actual execution happens later, asynchronously, by
 * the background job worker.
 */
public interface BackgroundJobPort {

  /**
   * Enqueues a job to be executed asynchronously.
   *
   * @param userId the account the job concerns, or {@code null} for system-level jobs
   * @param kind the job kind, which selects the handler at runtime
   * @param jsonPayload JSON-encoded job-specific input; must not contain raw passwords, tokens, or
   *     other secret values
   * @return the id of the newly created job row
   */
  UUID enqueue(UUID userId, BackgroundJobKind kind, String jsonPayload);
}
