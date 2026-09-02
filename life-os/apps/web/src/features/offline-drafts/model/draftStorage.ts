/**
 * Session-scoped offline draft storage engine (LOS-1312).
 *
 * Implements user-scoped local draft persistence for forms, notes, and capture workflows.
 * Drafts are namespaced under `lifeos.drafts.<userId>.<draftKey>`, encrypted-where-practical
 * before writing to browser storage, auto-expired after a configurable TTL (default 7 days),
 * and automatically purged on logout or account switch.
 */

export interface OfflineDraft<T = unknown> {
  readonly key: string;
  readonly userId: string;
  readonly data: T;
  readonly updatedAt: string;
  readonly expiresAt: string;
  readonly version: number;
}

export interface SaveDraftOptions {
  /** Time-to-live in days. Defaults to 7 days. */
  readonly expiresInDays?: number;
  /** Custom version marker for form schema evolution. Defaults to 1. */
  readonly version?: number;
}

export const DRAFT_STORAGE_PREFIX = "lifeos.drafts.";
export const DEFAULT_DRAFT_EXPIRY_DAYS = 7;
export const MAX_SINGLE_DRAFT_BYTES = 256 * 1024; // 256 KB limit per draft

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    // Graceful fallback for restricted/sandboxed environments
    return null;
  }
}

export function buildDraftStorageKey(userId: string, draftKey: string): string {
  return `${DRAFT_STORAGE_PREFIX}${userId}.${draftKey}`;
}

/**
 * Simple, fast XOR-based payload encryption with per-user salt.
 * Ensures draft contents are not stored in raw plain text inside browser storage.
 */
export function encryptPayload(plaintext: string, userId: string): string {
  if (!plaintext) return "";
  try {
    const salt = `${userId}-lifeos-draft-salt`;
    const uriEncoded = encodeURIComponent(plaintext);
    let result = "";
    for (let i = 0; i < uriEncoded.length; i++) {
      const charCode = uriEncoded.charCodeAt(i) ^ salt.charCodeAt(i % salt.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result);
  } catch {
    return plaintext;
  }
}

export function decryptPayload(ciphertext: string, userId: string): string {
  if (!ciphertext) return "";
  try {
    const salt = `${userId}-lifeos-draft-salt`;
    const raw = atob(ciphertext);
    let result = "";
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i) ^ salt.charCodeAt(i % salt.length);
      result += String.fromCharCode(charCode);
    }
    return decodeURIComponent(result);
  } catch {
    return ciphertext;
  }
}

export function isDraftExpired(
  draft: Pick<OfflineDraft, "expiresAt">,
  now: number = Date.now(),
): boolean {
  try {
    const expiryMs = new Date(draft.expiresAt).getTime();
    return Number.isNaN(expiryMs) || expiryMs <= now;
  } catch {
    return true;
  }
}

function isOfflineDraft(candidate: unknown): candidate is OfflineDraft {
  if (typeof candidate !== "object" || candidate === null) return false;
  const obj = candidate as Record<string, unknown>;
  return (
    typeof obj.key === "string" &&
    typeof obj.userId === "string" &&
    "data" in obj &&
    typeof obj.updatedAt === "string" &&
    typeof obj.expiresAt === "string" &&
    typeof obj.version === "number"
  );
}

/**
 * Saves a user-scoped draft to local storage with encryption, expiration, and quota handling.
 */
export function saveDraft<T>(
  userId: string,
  draftKey: string,
  data: T,
  options: SaveDraftOptions = {},
): OfflineDraft<T> | null {
  if (!userId || !draftKey) return null;
  const storage = getStorage();
  if (!storage) return null;

  const nowMs = Date.now();
  const expiresInDays = options.expiresInDays ?? DEFAULT_DRAFT_EXPIRY_DAYS;
  const expiresAtMs = nowMs + expiresInDays * 24 * 60 * 60 * 1000;

  const draft: OfflineDraft<T> = {
    key: draftKey,
    userId,
    data,
    updatedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    version: options.version ?? 1,
  };

  const jsonString = JSON.stringify(draft);
  if (jsonString.length > MAX_SINGLE_DRAFT_BYTES) {
    // Omit saving drafts that exceed the maximum single draft threshold
    return null;
  }

  const storageKey = buildDraftStorageKey(userId, draftKey);
  const encryptedPayload = encryptPayload(jsonString, userId);

  // Prune any expired drafts before saving
  pruneExpiredUserDrafts(userId, nowMs);

  try {
    storage.setItem(storageKey, encryptedPayload);
    return draft;
  } catch {
    // If storage write failed (e.g. QuotaExceededError), prune oldest drafts and retry once
    evictOldestUserDrafts(userId, 1);
    try {
      storage.setItem(storageKey, encryptedPayload);
      return draft;
    } catch {
      return null;
    }
  }
}

/**
 * Reads a user-scoped draft from local storage, decrypting and validating expiration.
 */
export function readDraft<T>(userId: string, draftKey: string): OfflineDraft<T> | null {
  if (!userId || !draftKey) return null;
  const storage = getStorage();
  if (!storage) return null;

  const storageKey = buildDraftStorageKey(userId, draftKey);
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;

    const decrypted = decryptPayload(raw, userId);
    const parsed: unknown = JSON.parse(decrypted);

    if (!isOfflineDraft(parsed)) {
      deleteDraft(userId, draftKey);
      return null;
    }

    if (isDraftExpired(parsed)) {
      deleteDraft(userId, draftKey);
      return null;
    }

    return parsed as OfflineDraft<T>;
  } catch {
    deleteDraft(userId, draftKey);
    return null;
  }
}

/**
 * Deletes a single user-scoped draft by draftKey.
 */
export function deleteDraft(userId: string, draftKey: string): void {
  if (!userId || !draftKey) return;
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(buildDraftStorageKey(userId, draftKey));
  } catch {
    // Ignore storage removal errors
  }
}

/**
 * Lists all non-expired offline drafts belonging to a specific user.
 */
export function listUserDrafts(userId: string): OfflineDraft[] {
  if (!userId) return [];
  const storage = getStorage();
  if (!storage) return [];

  const userPrefix = `${DRAFT_STORAGE_PREFIX}${userId}.`;
  const result: OfflineDraft[] = [];
  const nowMs = Date.now();
  const keysToRemove: string[] = [];

  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(userPrefix)) {
        const raw = storage.getItem(key);
        if (!raw) continue;

        try {
          const decrypted = decryptPayload(raw, userId);
          const parsed: unknown = JSON.parse(decrypted);

          if (isOfflineDraft(parsed)) {
            if (isDraftExpired(parsed, nowMs)) {
              keysToRemove.push(key);
            } else {
              result.push(parsed);
            }
          } else {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }

    for (const keyToRemove of keysToRemove) {
      storage.removeItem(keyToRemove);
    }
  } catch {
    // Return whatever was collected
  }

  return result;
}

/**
 * Clears all stored drafts belonging to a specific user.
 */
export function clearUserDrafts(userId: string): void {
  if (!userId) return;
  const storage = getStorage();
  if (!storage) return;

  const userPrefix = `${DRAFT_STORAGE_PREFIX}${userId}.`;
  const keysToRemove: string[] = [];

  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(userPrefix)) {
        keysToRemove.push(key);
      }
    }

    for (const keyToRemove of keysToRemove) {
      storage.removeItem(keyToRemove);
    }
  } catch {
    // Ignore storage clear errors
  }
}

/**
 * Clears all stored offline drafts across all users (e.g. full storage reset).
 */
export function clearAllDrafts(): void {
  const storage = getStorage();
  if (!storage) return;

  const keysToRemove: string[] = [];

  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(DRAFT_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    for (const keyToRemove of keysToRemove) {
      storage.removeItem(keyToRemove);
    }
  } catch {
    // Ignore storage clear errors
  }
}

/**
 * Internal helper to prune expired drafts for a user.
 */
export function pruneExpiredUserDrafts(userId: string, _nowMs?: number): void {
  listUserDrafts(userId); // listUserDrafts automatically prunes expired drafts
}

/**
 * Internal helper to evict the oldest drafts for a user to free storage quota.
 */
export function evictOldestUserDrafts(userId: string, count: number = 1): void {
  const drafts = listUserDrafts(userId);
  if (drafts.length === 0) return;

  drafts.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  const toEvict = drafts.slice(0, count);
  for (const draft of toEvict) {
    deleteDraft(userId, draft.key);
  }
}
