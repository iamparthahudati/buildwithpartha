/**
 * Offline capture queue for Brain Dump (LOS-1207).
 *
 * Captures made while the browser is offline (or that fail before the request
 * is sent) are persisted to `localStorage` so nothing a user typed is lost when
 * the page is closed or reloaded. The queue is namespaced per user so drafts on
 * a shared browser never leak between accounts, and every storage access is
 * guarded — a private window, disabled storage, or a quota error degrades to an
 * in-memory no-op rather than throwing into the capture path.
 */

export interface QueuedCapture {
  /** Client-generated id, stable across reloads, used to de-duplicate flushes. */
  readonly id: string;
  readonly content: string;
  /** ISO timestamp of when the capture was queued. */
  readonly queuedAt: string;
}

const STORAGE_PREFIX = "lifeos.brain-dump.capture-queue.";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    // Accessing localStorage can throw (e.g. blocked cookies / sandbox).
    return null;
  }
}

function isQueuedCapture(value: unknown): value is QueuedCapture {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.queuedAt === "string"
  );
}

/** Reads the persisted queue for a user, tolerating missing/corrupt data. */
export function readCaptureQueue(userId: string): QueuedCapture[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQueuedCapture);
  } catch {
    return [];
  }
}

/** Persists the queue for a user, silently ignoring storage failures. */
export function writeCaptureQueue(userId: string, queue: readonly QueuedCapture[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (queue.length === 0) {
      storage.removeItem(storageKey(userId));
    } else {
      storage.setItem(storageKey(userId), JSON.stringify(queue));
    }
  } catch {
    // Best-effort persistence; the caller still holds the in-memory queue.
  }
}

function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the timestamp-based id.
  }
  return `bd-queue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Appends a capture to the persisted queue and returns the new queue. The
 * caller passes the resulting queue into React state so the UI and storage stay
 * in sync.
 */
export function enqueueCapture(
  userId: string,
  content: string,
  now: () => string = () => new Date().toISOString(),
): QueuedCapture[] {
  const trimmed = content.trim();
  if (!trimmed) return readCaptureQueue(userId);
  const entry: QueuedCapture = { id: generateId(), content: trimmed, queuedAt: now() };
  const next = [...readCaptureQueue(userId), entry];
  writeCaptureQueue(userId, next);
  return next;
}

/** Removes a single queued capture by id and returns the new queue. */
export function removeQueuedCapture(userId: string, id: string): QueuedCapture[] {
  const next = readCaptureQueue(userId).filter((entry) => entry.id !== id);
  writeCaptureQueue(userId, next);
  return next;
}

/** Clears the entire queue for a user. */
export function clearCaptureQueue(userId: string): void {
  writeCaptureQueue(userId, []);
}
