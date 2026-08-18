package tech.buildwithpartha.lifeos.notification.domain;

import java.time.Instant;
import java.util.List;

/** Persistence port for {@link OutboxMessage}. */
public interface OutboxRepository {

  /** Inserts a new message or persists the result of a state transition. */
  OutboxMessage save(OutboxMessage message);

  /**
   * @return up to {@code limit} {@link OutboxMessageStatus#PENDING} messages whose {@code
   *     nextAttemptAt} is at or before {@code now}, ordered so the longest-waiting message is
   *     dispatched first
   */
  List<OutboxMessage> findDueForDispatch(Instant now, int limit);

  /**
   * Deletes terminal ({@link OutboxMessageStatus#SENT} or {@link
   * OutboxMessageStatus#DEAD_LETTERED}) messages last updated before {@code cutoff} (retention
   * class R1, {@code 31-PRIVACY-DATA-LIFECYCLE.md}).
   *
   * @return the number of rows deleted
   */
  int deleteTerminalOlderThan(Instant cutoff);
}
