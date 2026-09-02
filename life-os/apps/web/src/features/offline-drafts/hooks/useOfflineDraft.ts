import { useCallback, useEffect, useRef, useState } from "react";
import { deleteDraft, readDraft, saveDraft, type SaveDraftOptions } from "../model/draftStorage";

export interface UseOfflineDraftOptions<T> {
  /** Signed-in user id. Storage operations are disabled if null or empty. */
  readonly userId: string | null | undefined;
  /** Unique draft key for this form/resource instance (e.g. `note-editor-new` or `task-123`). */
  readonly draftKey: string;
  /** Default initial data if no local draft exists. */
  readonly initialData?: T;
  /** Time-to-live in days for the stored draft. Defaults to 7 days. */
  readonly expiresInDays?: number;
  /** Debounce delay in milliseconds before saving updates to storage. Defaults to 1000ms. */
  readonly debouncedMs?: number;
  /** Master toggle to disable draft syncing (e.g. while server sync is active). Defaults to true. */
  readonly enabled?: boolean;
}

export interface UseOfflineDraftResult<T> {
  /** Current draft value in memory. */
  readonly draftData: T | undefined;
  /** Updates the draft value in memory and schedules a debounced save. */
  readonly setDraftData: (data: T | ((prev: T | undefined) => T)) => void;
  /** Immediately forces a save to local storage. */
  readonly saveDraftNow: (dataOverride?: T) => void;
  /** Removes the local draft from browser storage and resets state. */
  readonly clearDraft: () => void;
  /** True if a valid local draft currently exists in browser storage. */
  readonly hasLocalDraft: boolean;
  /** Alias for hasLocalDraft for explicit UX checks. */
  readonly isDraftSavedLocally: boolean;
  /** ISO timestamp string of the last local storage save, or null. */
  readonly lastSavedAt: string | null;
}

interface InternalDraftState<T> {
  readonly data: T | undefined;
  readonly hasLocalDraft: boolean;
  readonly lastSavedAt: string | null;
}

export function useOfflineDraft<T>(options: UseOfflineDraftOptions<T>): UseOfflineDraftResult<T> {
  const {
    userId,
    draftKey,
    initialData,
    expiresInDays,
    debouncedMs = 1000,
    enabled = true,
  } = options;

  const [keyState, setKeyState] = useState({ userId, draftKey, enabled });

  const [draftState, setDraftState] = useState<InternalDraftState<T>>(() => {
    if (!enabled || !userId || !draftKey) {
      return { data: initialData, hasLocalDraft: false, lastSavedAt: null };
    }
    const existing = readDraft<T>(userId, draftKey);
    return existing
      ? { data: existing.data, hasLocalDraft: true, lastSavedAt: existing.updatedAt }
      : { data: initialData, hasLocalDraft: false, lastSavedAt: null };
  });

  // Adjust state during render if key or enabled prop changes
  if (
    keyState.userId !== userId ||
    keyState.draftKey !== draftKey ||
    keyState.enabled !== enabled
  ) {
    setKeyState({ userId, draftKey, enabled });
    if (!enabled || !userId || !draftKey) {
      setDraftState({ data: initialData, hasLocalDraft: false, lastSavedAt: null });
    } else {
      const existing = readDraft<T>(userId, draftKey);
      setDraftState(
        existing
          ? { data: existing.data, hasLocalDraft: true, lastSavedAt: existing.updatedAt }
          : { data: initialData, hasLocalDraft: false, lastSavedAt: null },
      );
    }
  }

  const { data: draftData, hasLocalDraft, lastSavedAt } = draftState;

  // Track latest value in ref for cleanup/debounced save
  const dataRef = useRef(draftData);
  useEffect(() => {
    dataRef.current = draftData;
  }, [draftData]);

  const saveDraftNow = useCallback(
    (dataOverride?: T) => {
      if (!enabled || !userId || !draftKey) return;
      const payload = dataOverride !== undefined ? dataOverride : dataRef.current;
      if (payload === undefined) return;

      const saveOpts: SaveDraftOptions = expiresInDays !== undefined ? { expiresInDays } : {};
      const result = saveDraft(userId, draftKey, payload, saveOpts);
      if (result) {
        setDraftState((prev) => ({
          ...prev,
          hasLocalDraft: true,
          lastSavedAt: result.updatedAt,
        }));
      }
    },
    [enabled, userId, draftKey, expiresInDays],
  );

  const setDraftData = useCallback((updater: T | ((prev: T | undefined) => T)) => {
    setDraftState((prev) => {
      const next = typeof updater === "function" ? (updater as any)(prev.data) : updater;
      dataRef.current = next;
      return { ...prev, data: next };
    });
  }, []);

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled || !userId || !draftKey || draftData === undefined) return;

    const timer = setTimeout(() => {
      saveDraftNow();
    }, debouncedMs);

    return () => clearTimeout(timer);
  }, [draftData, debouncedMs, enabled, userId, draftKey, saveDraftNow]);

  const clearDraft = useCallback(() => {
    if (userId && draftKey) {
      deleteDraft(userId, draftKey);
    }
    setDraftState({ data: initialData, hasLocalDraft: false, lastSavedAt: null });
  }, [userId, draftKey, initialData]);

  return {
    draftData,
    setDraftData,
    saveDraftNow,
    clearDraft,
    hasLocalDraft,
    isDraftSavedLocally: hasLocalDraft,
    lastSavedAt,
  };
}
