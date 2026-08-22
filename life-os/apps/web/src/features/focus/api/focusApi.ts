import { apiRequest } from "@lib/apiClient";

export type FocusSessionStatus = "running" | "paused" | "completed";

export interface FocusSession {
  readonly id: string;
  readonly taskId: string | null;
  readonly timeBlockId: string | null;
  readonly totalSeconds: number;
  readonly remainingSeconds: number;
  readonly status: FocusSessionStatus;
  readonly phase: "focus" | "break";
  readonly startedAt: string; // ISO string
  readonly pausedAt: string | null; // ISO string if paused
  readonly lastStateUpdatedAt: string; // ISO string
}

export interface StartFocusSessionRequest {
  readonly totalSeconds: number;
  readonly taskId?: string | null;
  readonly timeBlockId?: string | null;
}

/**
 * Retrieves the current active focus session.
 * Resolves to `null` if no session is active (204 No Content).
 */
export function getActiveSession(): Promise<FocusSession | null> {
  return apiRequest<FocusSession | null>("/focus-sessions/active", { method: "GET" }).then(
    (res) => res ?? null,
  );
}

/** Starts a new focus session. */
export function startSession(request: StartFocusSessionRequest): Promise<FocusSession> {
  return apiRequest<FocusSession>("/focus-sessions", {
    method: "POST",
    body: request,
  });
}

/** Pauses the current active focus session. */
export function pauseSession(): Promise<FocusSession> {
  return apiRequest<FocusSession>("/focus-sessions/active/pause", { method: "POST" });
}

/** Resumes the paused focus session. */
export function resumeSession(): Promise<FocusSession> {
  return apiRequest<FocusSession>("/focus-sessions/active/resume", { method: "POST" });
}

/** Completes the current active focus session. */
export function completeSession(): Promise<FocusSession> {
  return apiRequest<FocusSession>("/focus-sessions/active/complete", { method: "POST" });
}

/** Cancels the current active focus session. */
export function cancelSession(): Promise<FocusSession> {
  return apiRequest<FocusSession>("/focus-sessions/active/cancel", { method: "POST" });
}
