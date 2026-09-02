/**
 * React Hook for Offline Mutation Queue (LOS-1313).
 *
 * Monitored online/offline status, listens for reconnection to trigger replay,
 * enqueues allowed creates, and exposes queue management methods.
 */

import { useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { AuthSessionContext } from "@state/authSession";

import {
  replayMutationQueue,
  replaySingleMutation,
  type ReplayQueueResult,
  type ReplaySingleResult,
} from "../api/queueReplayer";
import {
  createQueuedMutation,
  type CreateQueuedMutationOptions,
  type QueuedMutation,
  type QueuedMutationType,
} from "../model/mutationQueue";
import {
  clearUserMutationQueue,
  deleteQueuedMutation,
  getQueuedMutation,
  listQueuedMutations,
  saveQueuedMutation,
} from "../model/queueStorage";

export interface UseOfflineMutationQueueOptions {
  readonly userId?: string;
  readonly autoReplayOnOnline?: boolean;
}

export interface UseOfflineMutationQueueResult {
  readonly isOnline: boolean;
  readonly mutations: readonly QueuedMutation[];
  readonly pendingCount: number;
  readonly isReplaying: boolean;
  readonly enqueueMutation: <T = unknown>(
    type: QueuedMutationType,
    endpoint: string,
    payload: T,
    options?: Partial<CreateQueuedMutationOptions<T>>,
  ) => QueuedMutation<T> | null;
  readonly retryMutation: (id: string) => Promise<ReplaySingleResult | null>;
  readonly removeMutation: (id: string) => boolean;
  readonly clearQueue: () => number;
  readonly replayQueue: () => Promise<ReplayQueueResult>;
  readonly refreshQueue: () => void;
}

export function useOfflineMutationQueue(
  options: UseOfflineMutationQueueOptions = {},
): UseOfflineMutationQueueResult {
  const session = useContext(AuthSessionContext);
  const activeUserId = options.userId ?? session?.user?.id ?? "";
  const autoReplay = options.autoReplayOnOnline ?? true;
  let queryClient: ReturnType<typeof useQueryClient> | undefined;
  try {
    queryClient = useQueryClient();
  } catch {
    queryClient = undefined;
  }

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [mutations, setMutations] = useState<readonly QueuedMutation[]>(() =>
    activeUserId ? listQueuedMutations(activeUserId) : [],
  );
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  const [prevUserId, setPrevUserId] = useState(activeUserId);
  if (prevUserId !== activeUserId) {
    setPrevUserId(activeUserId);
    setMutations(activeUserId ? listQueuedMutations(activeUserId) : []);
  }

  const refreshQueue = useCallback(() => {
    if (!activeUserId) {
      setMutations([]);
      return;
    }
    const current = listQueuedMutations(activeUserId);
    setMutations(current);
  }, [activeUserId]);

  const replayQueue = useCallback(async (): Promise<ReplayQueueResult> => {
    if (!activeUserId) {
      return { total: 0, succeeded: 0, failed: 0, conflict: 0, items: [] };
    }

    setIsReplaying(true);
    try {
      const result = await replayMutationQueue(activeUserId, {
        onMutationReplayed: () => {
          refreshQueue();
        },
      });

      if (result.succeeded > 0) {
        // Invalidate queries so UI refreshes with server-created records
        void queryClient.invalidateQueries();
      }

      refreshQueue();
      return result;
    } finally {
      setIsReplaying(false);
    }
  }, [activeUserId, queryClient, refreshQueue]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (autoReplay && activeUserId) {
        void replayQueue();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [activeUserId, autoReplay, replayQueue]);

  const enqueueMutation = useCallback(
    <T = unknown>(
      type: QueuedMutationType,
      endpoint: string,
      payload: T,
      extraOptions?: Partial<CreateQueuedMutationOptions<T>>,
    ): QueuedMutation<T> | null => {
      if (!activeUserId) {
        return null;
      }

      const newMutation = createQueuedMutation<T>({
        userId: activeUserId,
        type,
        endpoint,
        payload,
        ...extraOptions,
      });

      saveQueuedMutation(newMutation as QueuedMutation);
      refreshQueue();
      return newMutation;
    },
    [activeUserId, refreshQueue],
  );

  const retryMutation = useCallback(
    async (id: string): Promise<ReplaySingleResult | null> => {
      if (!activeUserId) return null;
      const target = getQueuedMutation(activeUserId, id);
      if (!target) return null;

      setIsReplaying(true);
      try {
        const result = await replaySingleMutation(target);
        if (result.success) {
          deleteQueuedMutation(activeUserId, id);
          void queryClient.invalidateQueries();
        }
        refreshQueue();
        return result;
      } finally {
        setIsReplaying(false);
      }
    },
    [activeUserId, queryClient, refreshQueue],
  );

  const removeMutation = useCallback(
    (id: string): boolean => {
      if (!activeUserId) return false;
      const removed = deleteQueuedMutation(activeUserId, id);
      if (removed) {
        refreshQueue();
      }
      return removed;
    },
    [activeUserId, refreshQueue],
  );

  const clearQueue = useCallback((): number => {
    if (!activeUserId) return 0;
    const count = clearUserMutationQueue(activeUserId);
    refreshQueue();
    return count;
  }, [activeUserId, refreshQueue]);

  const pendingCount = mutations.filter(
    (m) => m.status === "queued" || m.status === "syncing" || m.status === "failed",
  ).length;

  return {
    isOnline,
    mutations,
    pendingCount,
    isReplaying,
    enqueueMutation,
    retryMutation,
    removeMutation,
    clearQueue,
    replayQueue,
    refreshQueue,
  };
}
