package tech.buildwithpartha.lifeos.focus.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.focus.application.FocusSessionSnapshot;
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionPhase;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionStatus;

/** Refresh-safe Focus Session representation with server-clock reconciliation data. */
public record FocusSessionResponse(
    UUID id,
    UUID taskId,
    UUID timeBlockId,
    FocusSessionStatus status,
    FocusSessionPhase phase,
    long plannedFocusDurationSeconds,
    long plannedBreakDurationSeconds,
    long actualFocusDurationSeconds,
    long actualBreakDurationSeconds,
    Instant startedAt,
    Instant phaseStartedAt,
    Instant pausedAt,
    Instant endedAt,
    Instant createdAt,
    Instant updatedAt,
    Instant serverNow,
    long version,
    List<FocusSessionInterruptionResponse> interruptions) {

  public static FocusSessionResponse fromSnapshot(FocusSessionSnapshot snapshot) {
    FocusSession session = snapshot.session();
    return new FocusSessionResponse(
        session.id(),
        session.taskId().orElse(null),
        session.timeBlockId().orElse(null),
        session.status(),
        session.phase(),
        session.plannedFocusDuration().toSeconds(),
        session.plannedBreakDuration().toSeconds(),
        snapshot.actualFocusDuration().toSeconds(),
        snapshot.actualBreakDuration().toSeconds(),
        session.startedAt(),
        session.phaseStartedAt().orElse(null),
        session.pausedAt().orElse(null),
        session.endedAt().orElse(null),
        session.createdAt(),
        session.updatedAt(),
        snapshot.serverNow(),
        session.version(),
        snapshot.interruptions().stream()
            .map(FocusSessionInterruptionResponse::fromDomain)
            .toList());
  }
}
