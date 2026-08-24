import { apiRequest } from "@lib/apiClient";

/** Presentation status retained for existing Task scheduling contracts. */
export type FocusSessionStatus = "running" | "paused" | "completed";
export type FocusSessionApiStatus = "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type FocusSessionPhase = "FOCUS" | "BREAK";

export interface FocusSessionInterruption {
  readonly id: string;
  readonly occurredAt: string;
  readonly note: string | null;
  readonly createdAt: string;
  readonly version: number;
}

/** The canonical LOS-0913 response plus the client receipt anchor used for display ticking. */
export interface FocusSession {
  readonly id: string;
  readonly taskId: string | null;
  readonly timeBlockId: string | null;
  readonly status: FocusSessionApiStatus;
  readonly phase: FocusSessionPhase;
  readonly plannedFocusDurationSeconds: number;
  readonly plannedBreakDurationSeconds: number;
  readonly actualFocusDurationSeconds: number;
  readonly actualBreakDurationSeconds: number;
  readonly startedAt: string;
  readonly phaseStartedAt: string | null;
  readonly pausedAt: string | null;
  readonly endedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly serverNow: string;
  readonly version: number;
  readonly interruptions: readonly FocusSessionInterruption[];
  /** Browser time when this server-authoritative snapshot finished loading. */
  readonly clientReceivedAtMs: number;
}

type FocusSessionResponse = Omit<FocusSession, "clientReceivedAtMs">;

export interface StartFocusSessionRequest {
  readonly plannedFocusDurationSeconds: number;
  readonly plannedBreakDurationSeconds: number;
  readonly taskId?: string | null;
  readonly timeBlockId?: string | null;
}

export interface FocusSessionTransition {
  readonly sessionId: string;
  readonly version: number;
  readonly idempotencyKey: string;
}

function withReceiptAnchor(response: FocusSessionResponse): FocusSession {
  return { ...response, clientReceivedAtMs: Date.now() };
}

async function readSession(
  path: string,
  init: Parameters<typeof apiRequest<FocusSessionResponse>>[1],
): Promise<FocusSession> {
  return withReceiptAnchor(await apiRequest<FocusSessionResponse>(path, init));
}

/** Retrieves the current active Focus Session, or `null` for the API's 204 response. */
export async function getActiveSession(signal?: AbortSignal): Promise<FocusSession | null> {
  const response = await apiRequest<FocusSessionResponse | undefined>("/focus-sessions/active", {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return response ? withReceiptAnchor(response) : null;
}

/** Starts one server-authoritative Focus Session. */
export function startSession(
  request: StartFocusSessionRequest,
  idempotencyKey: string,
): Promise<FocusSession> {
  return readSession("/focus-sessions", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: request,
  });
}

function transition(path: string, command: FocusSessionTransition): Promise<FocusSession> {
  return readSession(`/focus-sessions/${encodeURIComponent(command.sessionId)}/${path}`, {
    method: "POST",
    headers: { "Idempotency-Key": command.idempotencyKey },
    body: { version: command.version },
  });
}

export function pauseSession(command: FocusSessionTransition): Promise<FocusSession> {
  return transition("pause", command);
}

export function resumeSession(command: FocusSessionTransition): Promise<FocusSession> {
  return transition("resume", command);
}

export function startBreak(command: FocusSessionTransition): Promise<FocusSession> {
  return transition("start-break", command);
}

export function resumeFocus(command: FocusSessionTransition): Promise<FocusSession> {
  return transition("resume-focus", command);
}

export function completeSession(command: FocusSessionTransition): Promise<FocusSession> {
  return transition("complete", command);
}

export function cancelSession(command: FocusSessionTransition): Promise<FocusSession> {
  return transition("cancel", command);
}

export function recordInterruption(
  command: FocusSessionTransition,
  note: string,
): Promise<FocusSession> {
  return readSession(`/focus-sessions/${encodeURIComponent(command.sessionId)}/interruptions`, {
    method: "POST",
    headers: { "Idempotency-Key": command.idempotencyKey },
    body: { version: command.version, note },
  });
}
