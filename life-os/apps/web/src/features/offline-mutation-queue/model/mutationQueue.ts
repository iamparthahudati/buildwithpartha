/**
 * Offline Mutation Queue Model (LOS-1313).
 *
 * Defines domain types, allowed creation operations, stable client ID generation,
 * content-free idempotency key helpers, and expiry calculations.
 */

export type QueuedMutationType = "CREATE_TASK" | "CREATE_NOTE" | "CREATE_BRAIN_DUMP_ITEM";

export const ALLOWED_MUTATION_TYPES: readonly QueuedMutationType[] = Object.freeze([
  "CREATE_TASK",
  "CREATE_NOTE",
  "CREATE_BRAIN_DUMP_ITEM",
]);

export type QueuedMutationStatus = "queued" | "syncing" | "failed" | "conflict";

export interface QueuedMutation<T = unknown> {
  readonly id: string;
  readonly userId: string;
  readonly type: QueuedMutationType;
  readonly endpoint: string;
  readonly payload: T;
  readonly idempotencyKey: string;
  readonly dependencyIds: readonly string[];
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly status: QueuedMutationStatus;
  readonly lastError?: string | null;
  readonly serverId?: string | null;
}

export const DEFAULT_QUEUE_EXPIRY_DAYS = 7;
export const DEFAULT_MAX_ATTEMPTS = 5;

export function isAllowedMutationType(type: string): type is QueuedMutationType {
  return ALLOWED_MUTATION_TYPES.includes(type as QueuedMutationType);
}

export function generateClientUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `loc-${timestamp}-${random}`;
}

export function generateIdempotencyKey(type: QueuedMutationType, clientUuid: string): string {
  const cleanType = type.toLowerCase().replace(/_/g, "-");
  const cleanUuid = clientUuid.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 32);
  const key = `ik-${cleanType}-${cleanUuid}`;
  // Idempotency key requirement: 8–64 safe ASCII letters, digits, '.', '_', '-'
  return key.slice(0, 64);
}

export function calculateExpiryTimestamp(
  now: Date = new Date(),
  expiryDays: number = DEFAULT_QUEUE_EXPIRY_DAYS,
): string {
  const expiryDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
  return expiryDate.toISOString();
}

export function isMutationExpired(mutation: QueuedMutation, now: Date = new Date()): boolean {
  const expiresAtTime = new Date(mutation.expiresAt).getTime();
  return Number.isNaN(expiresAtTime) || expiresAtTime <= now.getTime();
}

export interface CreateQueuedMutationOptions<T = unknown> {
  readonly userId: string;
  readonly type: QueuedMutationType;
  readonly endpoint: string;
  readonly payload: T;
  readonly dependencyIds?: readonly string[];
  readonly expiryDays?: number;
  readonly maxAttempts?: number;
  readonly customClientId?: string;
  readonly customIdempotencyKey?: string;
  readonly now?: Date;
}

export function createQueuedMutation<T = unknown>(
  options: CreateQueuedMutationOptions<T>,
): QueuedMutation<T> {
  if (!isAllowedMutationType(options.type)) {
    throw new Error(`Mutation type '${options.type}' is not allowed offline.`);
  }
  if (!options.userId || options.userId.trim() === "") {
    throw new Error("User ID is required for offline queue entry.");
  }

  const now = options.now ?? new Date();
  const id = options.customClientId ?? generateClientUuid();
  const idempotencyKey = options.customIdempotencyKey ?? generateIdempotencyKey(options.type, id);
  const expiresAt = calculateExpiryTimestamp(now, options.expiryDays ?? DEFAULT_QUEUE_EXPIRY_DAYS);

  return {
    id,
    userId: options.userId,
    type: options.type,
    endpoint: options.endpoint,
    payload: options.payload,
    idempotencyKey,
    dependencyIds: options.dependencyIds ?? [],
    createdAt: now.toISOString(),
    expiresAt,
    attemptCount: 0,
    maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    status: "queued",
    lastError: null,
    serverId: null,
  };
}
