import { describe, expect, it } from "vitest";

import type { FocusSession } from "../api/focusApi";
import { calculateFocusSessionClock } from "./focusSessionClock";

const BASE: FocusSession = {
  id: "session-1",
  taskId: null,
  timeBlockId: null,
  status: "RUNNING",
  phase: "FOCUS",
  plannedFocusDurationSeconds: 120,
  plannedBreakDurationSeconds: 30,
  actualFocusDurationSeconds: 20,
  actualBreakDurationSeconds: 5,
  startedAt: "2026-08-24T10:00:00Z",
  phaseStartedAt: "2026-08-24T10:00:00Z",
  pausedAt: null,
  endedAt: null,
  createdAt: "2026-08-24T10:00:00Z",
  updatedAt: "2026-08-24T10:00:20Z",
  serverNow: "2026-08-24T10:00:20Z",
  version: 1,
  interruptions: [],
  clientReceivedAtMs: 1_000,
};

describe("calculateFocusSessionClock", () => {
  it("derives focus elapsed time from the receipt anchor after sleep", () => {
    expect(calculateFocusSessionClock(BASE, 12_900)).toEqual({
      totalSeconds: 120,
      remainingSeconds: 89,
      actualFocusDurationSeconds: 31,
      actualBreakDurationSeconds: 5,
    });
  });

  it("advances only the active break phase", () => {
    expect(calculateFocusSessionClock({ ...BASE, phase: "BREAK" }, 6_000)).toEqual({
      totalSeconds: 30,
      remainingSeconds: 20,
      actualFocusDurationSeconds: 20,
      actualBreakDurationSeconds: 10,
    });
  });

  it("freezes paused snapshots and clamps expired phases", () => {
    expect(calculateFocusSessionClock({ ...BASE, status: "PAUSED" }, 500_000)).toMatchObject({
      remainingSeconds: 100,
      actualFocusDurationSeconds: 20,
    });
    expect(calculateFocusSessionClock(BASE, 500_000).remainingSeconds).toBe(0);
  });

  it("does not subtract time when the browser clock moves backwards", () => {
    expect(calculateFocusSessionClock(BASE, 500).remainingSeconds).toBe(100);
  });
});
