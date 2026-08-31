import { useCallback, useState } from "react";
import type { RecentSearch, SearchEntityType } from "../model/search";

const MAX_RECENTS = 10;
const STORAGE_PREFIX = "lifeos_recent_searches_";

export interface UseRecentSearchesOptions {
  readonly userId?: string | undefined;
  readonly storageKeyOverride?: string | undefined;
}

export interface UseRecentSearchesResult {
  readonly recents: readonly RecentSearch[];
  readonly addRecent: (
    query: string,
    target?: { readonly href: string; readonly title: string; readonly type: SearchEntityType },
  ) => void;
  readonly removeRecent: (id: string) => void;
  readonly clearRecents: () => void;
}

export function useRecentSearches({
  userId,
  storageKeyOverride,
}: UseRecentSearchesOptions = {}): UseRecentSearchesResult {
  const storageKey = storageKeyOverride ?? (userId ? `${STORAGE_PREFIX}${userId}` : null);

  const loadRecents = useCallback((): readonly RecentSearch[] => {
    if (!storageKey) return [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_RECENTS);
      }
    } catch {
      // Ignore localStorage read errors
    }
    return [];
  }, [storageKey]);

  const [prevStorageKey, setPrevStorageKey] = useState(storageKey);
  const [recents, setRecents] = useState<readonly RecentSearch[]>(loadRecents);

  if (prevStorageKey !== storageKey) {
    setPrevStorageKey(storageKey);
    setRecents(loadRecents());
  }

  const saveRecents = useCallback(
    (next: readonly RecentSearch[]) => {
      setRecents(next);
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore localStorage write errors
      }
    },
    [storageKey],
  );

  const addRecent = useCallback(
    (
      query: string,
      target?: { readonly href: string; readonly title: string; readonly type: SearchEntityType },
    ) => {
      const trimmed = query.trim();
      if (!trimmed && !target) return;

      setRecents((current) => {
        const filtered = current.filter((item) => {
          if (target && item.targetHref) {
            return item.targetHref !== target.href;
          }
          if (trimmed && !target) {
            return item.query.toLowerCase() !== trimmed.toLowerCase();
          }
          return true;
        });

        const newItem: RecentSearch = {
          id: `recent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          query: trimmed,
          timestamp: Date.now(),
          ...(target
            ? {
                targetHref: target.href,
                targetTitle: target.title,
                targetType: target.type,
              }
            : {}),
        };

        const updated = [newItem, ...filtered].slice(0, MAX_RECENTS);
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          } catch {
            // Ignore
          }
        }
        return updated;
      });
    },
    [storageKey],
  );

  const removeRecent = useCallback(
    (id: string) => {
      setRecents((current) => {
        const updated = current.filter((item) => item.id !== id);
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          } catch {
            // Ignore
          }
        }
        return updated;
      });
    },
    [storageKey],
  );

  const clearRecents = useCallback(() => {
    saveRecents([]);
  }, [saveRecents]);

  return {
    recents,
    addRecent,
    removeRecent,
    clearRecents,
  };
}
