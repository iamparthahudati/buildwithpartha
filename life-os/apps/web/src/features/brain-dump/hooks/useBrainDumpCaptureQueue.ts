import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateActivityQueries } from "@features/activity";
import { captureBrainDumpItem } from "../api/brainDumpApi";
import {
  clearCaptureQueue,
  enqueueCapture,
  readCaptureQueue,
  removeQueuedCapture,
  type QueuedCapture,
} from "../model/captureQueue";
import { invalidateBrainDumpQueries } from "./useBrainDump";

export interface FlushResult {
  /** Number of captures successfully sent during this flush. */
  readonly sent: number;
  /** Number of captures still queued (failed sends) after this flush. */
  readonly remaining: number;
}

export interface UseBrainDumpCaptureQueueResult {
  readonly queuedItems: readonly QueuedCapture[];
  readonly queuedCount: number;
  readonly isFlushing: boolean;
  /** Persists a capture for later send and returns immediately. */
  readonly enqueue: (content: string) => void;
  /** Attempts to send every queued capture; kept items are the ones that failed. */
  readonly flush: () => Promise<FlushResult>;
  /** Drops every queued capture without sending. */
  readonly discardAll: () => void;
}

export interface UseBrainDumpCaptureQueueOptions {
  readonly userId: string;
  readonly isOnline: boolean;
  /** When false (e.g. no authenticated user), the queue stays dormant. */
  readonly enabled?: boolean;
}

/**
 * Owns the offline Brain Dump capture queue (LOS-1207).
 *
 * Rehydrates the persisted queue on mount, exposes `enqueue` for captures made
 * while offline, and flushes the queue — sending each capture in order — as
 * soon as the browser comes back online. Successfully sent captures are removed
 * from persistence and the item list is invalidated; captures that fail are
 * retained so they can be retried, so a flaky reconnect never loses a thought.
 */
export function useBrainDumpCaptureQueue({
  userId,
  isOnline,
  enabled = true,
}: UseBrainDumpCaptureQueueOptions): UseBrainDumpCaptureQueueResult {
  const queryClient = useQueryClient();
  const [queuedItems, setQueuedItems] = useState<readonly QueuedCapture[]>([]);
  const [isFlushing, setIsFlushing] = useState(false);
  // Guards against overlapping flushes (auto-flush effect + manual "Sync now").
  const flushingRef = useRef(false);

  // Rehydrate the persisted queue whenever the active user changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQueuedItems(enabled && userId ? readCaptureQueue(userId) : []);
  }, [userId, enabled]);

  const enqueue = useCallback(
    (content: string) => {
      if (!userId) return;
      setQueuedItems(enqueueCapture(userId, content));
    },
    [userId],
  );

  const discardAll = useCallback(() => {
    if (!userId) return;
    clearCaptureQueue(userId);
    setQueuedItems([]);
  }, [userId]);

  const flush = useCallback(async (): Promise<FlushResult> => {
    if (!userId || flushingRef.current) return { sent: 0, remaining: queuedItems.length };
    const pending = readCaptureQueue(userId);
    if (pending.length === 0) return { sent: 0, remaining: 0 };

    flushingRef.current = true;
    setIsFlushing(true);
    let sent = 0;
    let remaining = pending.length;
    try {
      // Send in queued order; stop at the first failure so ordering is
      // preserved and we do not hammer a still-unreachable API.
      for (const entry of pending) {
        try {
          await captureBrainDumpItem({ content: entry.content });
          const next = removeQueuedCapture(userId, entry.id);
          setQueuedItems(next);
          sent += 1;
          remaining = next.length;
        } catch {
          break;
        }
      }
    } finally {
      flushingRef.current = false;
      setIsFlushing(false);
      if (sent > 0) {
        void invalidateBrainDumpQueries(queryClient);
        void invalidateActivityQueries(queryClient);
      }
    }
    return { sent, remaining };
  }, [userId, queryClient, queuedItems.length]);

  // Auto-flush when we (re)gain connectivity and have work waiting. Sending is
  // a genuine external side effect (the flush() setState is intentional).
  useEffect(() => {
    if (!enabled || !isOnline) return;
    if (queuedItems.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void flush();
  }, [enabled, isOnline, queuedItems.length, flush]);

  return {
    queuedItems,
    queuedCount: queuedItems.length,
    isFlushing,
    enqueue,
    flush,
    discardAll,
  };
}
