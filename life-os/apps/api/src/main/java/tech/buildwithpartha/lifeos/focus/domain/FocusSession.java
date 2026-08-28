package tech.buildwithpartha.lifeos.focus.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Immutable server-authoritative Focus Session aggregate and lifecycle state machine. */
public record FocusSession(
    UUID id,
    UUID userId,
    Optional<UUID> taskId,
    Optional<UUID> timeBlockId,
    FocusSessionStatus status,
    FocusSessionPhase phase,
    Duration plannedFocusDuration,
    Duration plannedBreakDuration,
    Duration actualFocusDuration,
    Duration actualBreakDuration,
    Instant startedAt,
    Optional<Instant> phaseStartedAt,
    Optional<Instant> pausedAt,
    Optional<Instant> endedAt,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public FocusSession {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");
    Objects.requireNonNull(timeBlockId, "timeBlockId must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(phase, "phase must not be null");
    requireDuration(plannedFocusDuration, "plannedFocusDuration", true);
    requireDuration(plannedBreakDuration, "plannedBreakDuration", false);
    requireDuration(actualFocusDuration, "actualFocusDuration", false);
    requireDuration(actualBreakDuration, "actualBreakDuration", false);
    Objects.requireNonNull(startedAt, "startedAt must not be null");
    Objects.requireNonNull(phaseStartedAt, "phaseStartedAt must not be null");
    Objects.requireNonNull(pausedAt, "pausedAt must not be null");
    Objects.requireNonNull(endedAt, "endedAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");

    if (startedAt.isBefore(createdAt)) {
      throw new IllegalArgumentException("startedAt must not be before createdAt");
    }
    if (updatedAt.isBefore(createdAt)) {
      throw new IllegalArgumentException("updatedAt must not be before createdAt");
    }
    if (version < 0) {
      throw new IllegalArgumentException("version must not be negative");
    }
    validateStateShape(status, startedAt, phaseStartedAt, pausedAt, endedAt);
    phaseStartedAt.ifPresent(value -> requireUpdatedAtCovers(updatedAt, value));
    pausedAt.ifPresent(value -> requireUpdatedAtCovers(updatedAt, value));
    endedAt.ifPresent(value -> requireUpdatedAtCovers(updatedAt, value));
  }

  public static FocusSession start(
      UUID id,
      UUID userId,
      Optional<UUID> taskId,
      Optional<UUID> timeBlockId,
      Duration plannedFocusDuration,
      Duration plannedBreakDuration,
      Instant now) {
    return new FocusSession(
        id,
        userId,
        taskId,
        timeBlockId,
        FocusSessionStatus.RUNNING,
        FocusSessionPhase.FOCUS,
        plannedFocusDuration,
        plannedBreakDuration,
        Duration.ZERO,
        Duration.ZERO,
        now,
        Optional.of(now),
        Optional.empty(),
        Optional.empty(),
        now,
        now,
        0);
  }

  public FocusSession pause(Instant now) {
    requireStatus(FocusSessionStatus.RUNNING, "pause");
    return settleRunningPhase(
        FocusSessionStatus.PAUSED,
        phase,
        Optional.empty(),
        Optional.of(now),
        Optional.empty(),
        now);
  }

  public FocusSession resume(Instant now) {
    requireStatus(FocusSessionStatus.PAUSED, "resume");
    requireTransitionAtOrAfter(now, pausedAt.orElseThrow());
    return copy(
        FocusSessionStatus.RUNNING,
        phase,
        actualFocusDuration,
        actualBreakDuration,
        Optional.of(now),
        Optional.empty(),
        Optional.empty(),
        now);
  }

  public FocusSession startBreak(Instant now) {
    requireRunningPhase(FocusSessionPhase.FOCUS, "start a break");
    return settleRunningPhase(
        FocusSessionStatus.RUNNING,
        FocusSessionPhase.BREAK,
        Optional.of(now),
        Optional.empty(),
        Optional.empty(),
        now);
  }

  public FocusSession resumeFocus(Instant now) {
    requireRunningPhase(FocusSessionPhase.BREAK, "resume focus");
    return settleRunningPhase(
        FocusSessionStatus.RUNNING,
        FocusSessionPhase.FOCUS,
        Optional.of(now),
        Optional.empty(),
        Optional.empty(),
        now);
  }

  public FocusSession complete(Instant now) {
    return end(FocusSessionStatus.COMPLETED, now);
  }

  public FocusSession cancel(Instant now) {
    return end(FocusSessionStatus.CANCELLED, now);
  }

  public Duration actualFocusDurationAt(Instant now) {
    return currentDurationAt(FocusSessionPhase.FOCUS, actualFocusDuration, now);
  }

  public Duration actualBreakDurationAt(Instant now) {
    return currentDurationAt(FocusSessionPhase.BREAK, actualBreakDuration, now);
  }

  public boolean isOwnedBy(UUID candidateUserId) {
    return userId.equals(candidateUserId);
  }

  public FocusSessionInterruption recordInterruption(
      UUID interruptionId, Instant now, String note) {
    if (!status.isActive()) {
      throw invalidTransition("record an interruption");
    }
    requireTransitionAtOrAfter(now, updatedAt);
    return FocusSessionInterruption.record(interruptionId, id, userId, now, note);
  }

  private FocusSession end(FocusSessionStatus terminalStatus, Instant now) {
    if (!status.isActive()) {
      throw invalidTransition(
          terminalStatus == FocusSessionStatus.COMPLETED ? "complete" : "cancel");
    }
    if (status == FocusSessionStatus.RUNNING) {
      return settleRunningPhase(
          terminalStatus, phase, Optional.empty(), Optional.empty(), Optional.of(now), now);
    }
    requireTransitionAtOrAfter(now, pausedAt.orElseThrow());
    return copy(
        terminalStatus,
        phase,
        actualFocusDuration,
        actualBreakDuration,
        Optional.empty(),
        Optional.empty(),
        Optional.of(now),
        now);
  }

  private FocusSession settleRunningPhase(
      FocusSessionStatus nextStatus,
      FocusSessionPhase nextPhase,
      Optional<Instant> nextPhaseStartedAt,
      Optional<Instant> nextPausedAt,
      Optional<Instant> nextEndedAt,
      Instant now) {
    Instant anchor = phaseStartedAt.orElseThrow();
    requireTransitionAtOrAfter(now, anchor);
    Duration elapsed = Duration.between(anchor, now);
    Duration nextFocus =
        phase == FocusSessionPhase.FOCUS ? actualFocusDuration.plus(elapsed) : actualFocusDuration;
    Duration nextBreak =
        phase == FocusSessionPhase.BREAK ? actualBreakDuration.plus(elapsed) : actualBreakDuration;
    return copy(
        nextStatus,
        nextPhase,
        nextFocus,
        nextBreak,
        nextPhaseStartedAt,
        nextPausedAt,
        nextEndedAt,
        now);
  }

  private Duration currentDurationAt(
      FocusSessionPhase requestedPhase, Duration accumulated, Instant now) {
    Objects.requireNonNull(now, "now must not be null");
    if (status != FocusSessionStatus.RUNNING || phase != requestedPhase) {
      return accumulated;
    }
    Instant anchor = phaseStartedAt.orElseThrow();
    requireTransitionAtOrAfter(now, anchor);
    return accumulated.plus(Duration.between(anchor, now));
  }

  private FocusSession copy(
      FocusSessionStatus nextStatus,
      FocusSessionPhase nextPhase,
      Duration nextActualFocusDuration,
      Duration nextActualBreakDuration,
      Optional<Instant> nextPhaseStartedAt,
      Optional<Instant> nextPausedAt,
      Optional<Instant> nextEndedAt,
      Instant nextUpdatedAt) {
    return new FocusSession(
        id,
        userId,
        taskId,
        timeBlockId,
        nextStatus,
        nextPhase,
        plannedFocusDuration,
        plannedBreakDuration,
        nextActualFocusDuration,
        nextActualBreakDuration,
        startedAt,
        nextPhaseStartedAt,
        nextPausedAt,
        nextEndedAt,
        createdAt,
        nextUpdatedAt,
        version);
  }

  private void requireStatus(FocusSessionStatus expected, String action) {
    if (status != expected) {
      throw invalidTransition(action);
    }
  }

  private void requireRunningPhase(FocusSessionPhase expected, String action) {
    if (status != FocusSessionStatus.RUNNING || phase != expected) {
      throw invalidTransition(action);
    }
  }

  private IllegalStateException invalidTransition(String action) {
    return new IllegalStateException(
        "Cannot " + action + " a Focus Session in " + status + "/" + phase);
  }

  private static void requireTransitionAtOrAfter(Instant now, Instant boundary) {
    Objects.requireNonNull(now, "now must not be null");
    if (now.isBefore(boundary)) {
      throw new IllegalArgumentException("transition time must not move backwards");
    }
  }

  private static void requireUpdatedAtCovers(Instant updatedAt, Instant stateTimestamp) {
    if (updatedAt.isBefore(stateTimestamp)) {
      throw new IllegalArgumentException("updatedAt must cover the latest state timestamp");
    }
  }

  private static void requireDuration(Duration duration, String name, boolean positive) {
    Objects.requireNonNull(duration, name + " must not be null");
    if (duration.isNegative() || (positive && duration.isZero())) {
      throw new IllegalArgumentException(
          name + (positive ? " must be positive" : " must not be negative"));
    }
  }

  private static void validateStateShape(
      FocusSessionStatus status,
      Instant startedAt,
      Optional<Instant> phaseStartedAt,
      Optional<Instant> pausedAt,
      Optional<Instant> endedAt) {
    if (status == FocusSessionStatus.RUNNING) {
      if (phaseStartedAt.isEmpty() || pausedAt.isPresent() || endedAt.isPresent()) {
        throw new IllegalArgumentException("RUNNING Focus Session has an invalid clock state");
      }
      requireTransitionAtOrAfter(phaseStartedAt.orElseThrow(), startedAt);
    } else if (status == FocusSessionStatus.PAUSED) {
      if (phaseStartedAt.isPresent() || pausedAt.isEmpty() || endedAt.isPresent()) {
        throw new IllegalArgumentException("PAUSED Focus Session has an invalid clock state");
      }
      requireTransitionAtOrAfter(pausedAt.orElseThrow(), startedAt);
    } else {
      if (phaseStartedAt.isPresent() || pausedAt.isPresent() || endedAt.isEmpty()) {
        throw new IllegalArgumentException("Terminal Focus Session has an invalid clock state");
      }
      requireTransitionAtOrAfter(endedAt.orElseThrow(), startedAt);
    }
  }
}
