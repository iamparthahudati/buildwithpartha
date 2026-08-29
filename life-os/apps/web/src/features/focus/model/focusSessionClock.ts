import type { FocusSession } from "../api/focusApi";

export interface FocusSessionClock {
  readonly totalSeconds: number;
  readonly remainingSeconds: number;
  readonly actualFocusDurationSeconds: number;
  readonly actualBreakDurationSeconds: number;
}

/**
 * Advances a canonical server snapshot from its browser receipt anchor.
 * Recomputing from timestamps instead of counting interval callbacks keeps the
 * display correct after throttling, backgrounding, and device sleep.
 */
export function calculateFocusSessionClock(
  session: FocusSession,
  clientNowMs: number,
): FocusSessionClock {
  const elapsedSinceReceipt =
    session.status === "RUNNING"
      ? Math.max(0, Math.floor((clientNowMs - session.clientReceivedAtMs) / 1000))
      : 0;
  const actualFocusDurationSeconds =
    session.actualFocusDurationSeconds +
    (session.status === "RUNNING" && session.phase === "FOCUS" ? elapsedSinceReceipt : 0);
  const actualBreakDurationSeconds =
    session.actualBreakDurationSeconds +
    (session.status === "RUNNING" && session.phase === "BREAK" ? elapsedSinceReceipt : 0);
  const totalSeconds =
    session.phase === "FOCUS"
      ? session.plannedFocusDurationSeconds
      : session.plannedBreakDurationSeconds;
  const actualPhaseSeconds =
    session.phase === "FOCUS" ? actualFocusDurationSeconds : actualBreakDurationSeconds;

  return {
    totalSeconds,
    remainingSeconds: Math.max(0, totalSeconds - actualPhaseSeconds),
    actualFocusDurationSeconds,
    actualBreakDurationSeconds,
  };
}
