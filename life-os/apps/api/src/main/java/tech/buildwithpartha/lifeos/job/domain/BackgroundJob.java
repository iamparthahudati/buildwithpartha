package tech.buildwithpartha.lifeos.job.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;

/**
 * A background job row: from enqueue through succeeded or dead-lettered.
 *
 * <p>{@link #payload()} may contain user-identifying data (e.g. an export request's options), so
 * every transition to a terminal state ({@link #recordSuccess} and {@link #recordFailure} once the
 * retry budget is exhausted) erases it to {@code "{}"} — matching the "payload erased on terminal
 * state" requirement in {@code 31-PRIVACY-DATA-LIFECYCLE.md}.
 *
 * <p>State machine:
 *
 * <pre>
 *   PENDING → RUNNING → SUCCEEDED (terminal)
 *                    ↘ PENDING    (retry, via recordFailure while budget remains)
 *                    ↘ DEAD_LETTERED (terminal, via recordFailure when exhausted)
 * </pre>
 */
public record BackgroundJob(
    UUID id,
    Optional<UUID> userId,
    BackgroundJobKind kind,
    String payload,
    BackgroundJobStatus status,
    int attemptCount,
    Instant nextAttemptAt,
    Optional<Instant> lastAttemptAt,
    Optional<String> lastErrorClass,
    Optional<Instant> startedAt,
    Optional<Instant> completedAt,
    Optional<Instant> deadLetteredAt,
    Instant createdAt,
    Instant updatedAt) {

  public BackgroundJob {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(kind, "kind must not be null");
    Objects.requireNonNull(payload, "payload must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(nextAttemptAt, "nextAttemptAt must not be null");
    Objects.requireNonNull(lastAttemptAt, "lastAttemptAt must not be null");
    Objects.requireNonNull(lastErrorClass, "lastErrorClass must not be null");
    Objects.requireNonNull(startedAt, "startedAt must not be null");
    Objects.requireNonNull(completedAt, "completedAt must not be null");
    Objects.requireNonNull(deadLetteredAt, "deadLetteredAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    if (attemptCount < 0) {
      throw new IllegalArgumentException("attemptCount must be zero or greater");
    }
  }

  /** Factory: creates a new PENDING job ready to be enqueued. */
  public static BackgroundJob enqueue(
      UUID id, UUID userId, BackgroundJobKind kind, String jsonPayload, Instant now) {
    return new BackgroundJob(
        id,
        Optional.ofNullable(userId),
        kind,
        jsonPayload,
        BackgroundJobStatus.PENDING,
        0,
        now,
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        now,
        now);
  }

  /** Transitions PENDING → RUNNING: records that the worker has claimed this job. */
  public BackgroundJob markRunning(Instant now) {
    return new BackgroundJob(
        id,
        userId,
        kind,
        payload,
        BackgroundJobStatus.RUNNING,
        attemptCount,
        nextAttemptAt,
        lastAttemptAt,
        lastErrorClass,
        Optional.of(now),
        completedAt,
        deadLetteredAt,
        createdAt,
        now);
  }

  /** Transitions RUNNING → SUCCEEDED: payload is erased. */
  public BackgroundJob recordSuccess(Instant now) {
    return new BackgroundJob(
        id,
        userId,
        kind,
        "{}",
        BackgroundJobStatus.SUCCEEDED,
        attemptCount,
        nextAttemptAt,
        Optional.of(now),
        lastErrorClass,
        startedAt,
        Optional.of(now),
        deadLetteredAt,
        createdAt,
        now);
  }

  /**
   * Transitions RUNNING → PENDING (retry) or RUNNING → DEAD_LETTERED (budget exhausted). Payload is
   * erased when dead-lettered.
   */
  public BackgroundJob recordFailure(
      Instant now, String sanitizedErrorClass, JobRetryPolicy retryPolicy) {
    Objects.requireNonNull(now, "now must not be null");
    Objects.requireNonNull(sanitizedErrorClass, "sanitizedErrorClass must not be null");
    Objects.requireNonNull(retryPolicy, "retryPolicy must not be null");

    int newAttemptCount = attemptCount + 1;
    if (retryPolicy.isExhausted(newAttemptCount)) {
      return new BackgroundJob(
          id,
          userId,
          kind,
          "{}",
          BackgroundJobStatus.DEAD_LETTERED,
          newAttemptCount,
          nextAttemptAt,
          Optional.of(now),
          Optional.of(sanitizedErrorClass),
          startedAt,
          completedAt,
          Optional.of(now),
          createdAt,
          now);
    }
    return new BackgroundJob(
        id,
        userId,
        kind,
        payload,
        BackgroundJobStatus.PENDING,
        newAttemptCount,
        now.plus(retryPolicy.delayFor(newAttemptCount)),
        Optional.of(now),
        Optional.of(sanitizedErrorClass),
        startedAt,
        completedAt,
        deadLetteredAt,
        createdAt,
        now);
  }

  /** Returns {@code true} when this job has reached a terminal state. */
  public boolean isTerminal() {
    return status == BackgroundJobStatus.SUCCEEDED || status == BackgroundJobStatus.DEAD_LETTERED;
  }
}
