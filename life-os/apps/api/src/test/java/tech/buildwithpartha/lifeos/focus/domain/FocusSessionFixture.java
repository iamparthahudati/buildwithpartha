package tech.buildwithpartha.lifeos.focus.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

final class FocusSessionFixture {

  private FocusSessionFixture() {}

  static FocusSession runningSession(UUID userId, Instant startedAt) {
    return FocusSession.start(
        UUID.randomUUID(),
        userId,
        Optional.empty(),
        Optional.empty(),
        Duration.ofMinutes(25),
        Duration.ofMinutes(5),
        startedAt);
  }

  static FocusSession persistedSession(
      UUID id,
      UUID userId,
      Optional<UUID> taskId,
      Optional<UUID> timeBlockId,
      FocusSessionStatus status,
      FocusSessionPhase phase,
      Duration actualFocus,
      Duration actualBreak,
      Instant startedAt,
      Optional<Instant> phaseStartedAt,
      Optional<Instant> pausedAt,
      Optional<Instant> endedAt,
      long version) {
    return new FocusSession(
        id,
        userId,
        taskId,
        timeBlockId,
        status,
        phase,
        Duration.ofMinutes(25),
        Duration.ofMinutes(5),
        actualFocus,
        actualBreak,
        startedAt,
        phaseStartedAt,
        pausedAt,
        endedAt,
        startedAt,
        endedAt.or(() -> pausedAt).or(() -> phaseStartedAt).orElse(startedAt),
        version);
  }
}
