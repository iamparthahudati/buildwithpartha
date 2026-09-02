/**
 * Offline Mutation Queue Storage Engine (LOS-1313).
 *
 * Provides session-bound, obfuscated local storage persistence for queued mutations,
 * automatic 7-day TTL pruning, dependency ordering, and session logout cleanup.
 */

import { isMutationExpired, type QueuedMutation, type QueuedMutationStatus } from "./mutationQueue";

export const QUEUE_STORAGE_PREFIX = "lifeos.queue";

export function buildQueueStorageKey(userId: string, id: string): string {
  return `${QUEUE_STORAGE_PREFIX}.${userId}.${id}`;
}

export function encryptQueuePayload(rawText: string, salt: string): string {
  if (typeof btoa !== "function") {
    return rawText;
  }
  try {
    const combined = `${salt}:${rawText}`;
    const encoded = new TextEncoder().encode(combined);
    let binary = "";
    encoded.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  } catch {
    return rawText;
  }
}

export function decryptQueuePayload(encodedText: string, salt: string): string {
  if (typeof atob !== "function") {
    return encodedText;
  }
  try {
    const binary = atob(encodedText);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const prefix = `${salt}:`;
    if (decoded.startsWith(prefix)) {
      return decoded.slice(prefix.length);
    }
    return decoded;
  } catch {
    return encodedText;
  }
}

export function saveQueuedMutation(mutation: QueuedMutation): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  const key = buildQueueStorageKey(mutation.userId, mutation.id);
  const salt = `${mutation.userId}-lifeos-queue-salt`;
  const serialized = JSON.stringify(mutation);
  const encrypted = encryptQueuePayload(serialized, salt);
  window.localStorage.setItem(key, encrypted);
}

export function getQueuedMutation(userId: string, id: string): QueuedMutation | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  const key = buildQueueStorageKey(userId, id);
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  const salt = `${userId}-lifeos-queue-salt`;
  const decrypted = decryptQueuePayload(raw, salt);
  try {
    const item = JSON.parse(decrypted) as QueuedMutation;
    if (isMutationExpired(item)) {
      window.localStorage.removeItem(key);
      return null;
    }
    return item;
  } catch {
    return null;
  }
}

export function listQueuedMutations(userId: string): readonly QueuedMutation[] {
  if (typeof window === "undefined" || !window.localStorage || !userId) {
    return [];
  }

  const prefix = `${QUEUE_STORAGE_PREFIX}.${userId}.`;
  const mutations: QueuedMutation[] = [];
  const keysToRemove: string[] = [];
  const now = new Date();

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const salt = `${userId}-lifeos-queue-salt`;
      const decrypted = decryptQueuePayload(raw, salt);
      try {
        const item = JSON.parse(decrypted) as QueuedMutation;
        if (isMutationExpired(item, now)) {
          keysToRemove.push(key);
        } else {
          mutations.push(item);
        }
      } catch {
        keysToRemove.push(key);
      }
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));

  // Sort by createdAt ascending to preserve dependency / submission sequence
  return mutations.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB;
  });
}

export function updateQueuedMutation(mutation: QueuedMutation): void {
  saveQueuedMutation(mutation);
}

export function updateQueuedMutationStatus(
  userId: string,
  id: string,
  status: QueuedMutationStatus,
  lastError: string | null = null,
  serverId: string | null = null,
  incrementAttempt = false,
): QueuedMutation | null {
  const existing = getQueuedMutation(userId, id);
  if (!existing) {
    return null;
  }

  const updated: QueuedMutation = {
    ...existing,
    status,
    lastError,
    serverId: serverId ?? existing.serverId ?? null,
    attemptCount: incrementAttempt ? existing.attemptCount + 1 : existing.attemptCount,
  };

  saveQueuedMutation(updated);
  return updated;
}

export function deleteQueuedMutation(userId: string, id: string): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  const key = buildQueueStorageKey(userId, id);
  if (window.localStorage.getItem(key) !== null) {
    window.localStorage.removeItem(key);
    return true;
  }
  return false;
}

export function clearUserMutationQueue(userId: string): number {
  if (typeof window === "undefined" || !window.localStorage || !userId) {
    return 0;
  }

  const prefix = `${QUEUE_STORAGE_PREFIX}.${userId}.`;
  const keysToRemove: string[] = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  return keysToRemove.length;
}

export function clearAllMutationQueues(): number {
  if (typeof window === "undefined" || !window.localStorage) {
    return 0;
  }

  const keysToRemove: string[] = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(`${QUEUE_STORAGE_PREFIX}.`)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  return keysToRemove.length;
}
