/**
 * Offline Draft Storage Feature Module (LOS-1312).
 *
 * Exposes session-scoped encrypted local draft persistence, hooks, and UX badges
 * for offline and unsaved form states.
 */

export {
  buildDraftStorageKey,
  clearAllDrafts,
  clearUserDrafts,
  decryptPayload,
  deleteDraft,
  DEFAULT_DRAFT_EXPIRY_DAYS,
  DRAFT_STORAGE_PREFIX,
  encryptPayload,
  isDraftExpired,
  listUserDrafts,
  readDraft,
  saveDraft,
  type OfflineDraft,
  type SaveDraftOptions,
} from "./model/draftStorage";

export {
  useOfflineDraft,
  type UseOfflineDraftOptions,
  type UseOfflineDraftResult,
} from "./hooks/useOfflineDraft";

export { DeviceDraftBadge, type DeviceDraftBadgeProps } from "./components/DeviceDraftBadge";
