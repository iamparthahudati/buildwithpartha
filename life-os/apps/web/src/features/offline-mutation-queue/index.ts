/**
 * Offline Mutation Queue Feature Module (LOS-1313).
 *
 * Exposes session-scoped encrypted offline creation queue, replay engine with idempotency,
 * React hooks, and UX status badges per 14-OFFLINE-SYNC.md.
 */

export {
  createQueuedMutation,
  generateClientUuid,
  generateIdempotencyKey,
  isAllowedMutationType,
  isMutationExpired,
  ALLOWED_MUTATION_TYPES,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_QUEUE_EXPIRY_DAYS,
  type CreateQueuedMutationOptions,
  type QueuedMutation,
  type QueuedMutationStatus,
  type QueuedMutationType,
} from "./model/mutationQueue";

export {
  buildQueueStorageKey,
  clearAllMutationQueues,
  clearUserMutationQueue,
  decryptQueuePayload,
  deleteQueuedMutation,
  encryptQueuePayload,
  getQueuedMutation,
  listQueuedMutations,
  saveQueuedMutation,
  updateQueuedMutation,
  updateQueuedMutationStatus,
  QUEUE_STORAGE_PREFIX,
} from "./model/queueStorage";

export {
  replayMutationQueue,
  replaySingleMutation,
  type ReplayQueueOptions,
  type ReplayQueueResult,
  type ReplaySingleResult,
} from "./api/queueReplayer";

export {
  useOfflineMutationQueue,
  type UseOfflineMutationQueueOptions,
  type UseOfflineMutationQueueResult,
} from "./hooks/useOfflineMutationQueue";

export { OfflineQueueBadge, type OfflineQueueBadgeProps } from "./components/OfflineQueueBadge";
