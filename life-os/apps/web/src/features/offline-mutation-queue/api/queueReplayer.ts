/**
 * Offline Mutation Queue Replay Engine (LOS-1313).
 *
 * Sequentially replays queued mutations over standard feature APIs with stable
 * idempotency keys upon network reconnection, updating status and handling lost responses.
 */

import { ApiError } from "@lib/apiClient";
import { captureBrainDumpItem, type CaptureBrainDumpRequestDto } from "@features/brain-dump";
import { createNote, type CreateNoteRequestDto } from "@features/notes";
import { createTask, type CreateTaskRequestDto } from "@features/tasks";

import {
  deleteQueuedMutation,
  getQueuedMutation,
  listQueuedMutations,
  updateQueuedMutationStatus,
} from "../model/queueStorage";
import type { QueuedMutation } from "../model/mutationQueue";

export interface ReplaySingleResult {
  readonly success: boolean;
  readonly serverId?: string;
  readonly error?: string;
  readonly isConflict?: boolean;
}

export interface ReplayQueueResult {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly conflict: number;
  readonly items: readonly QueuedMutation[];
}

export interface ReplayQueueOptions {
  readonly onMutationReplayed?: (mutation: QueuedMutation, result: ReplaySingleResult) => void;
}

export async function replaySingleMutation(mutation: QueuedMutation): Promise<ReplaySingleResult> {
  const headers: Record<string, string> = {
    "Idempotency-Key": mutation.idempotencyKey,
  };

  try {
    let serverId: string | undefined;

    switch (mutation.type) {
      case "CREATE_TASK": {
        const task = await createTask(mutation.payload as CreateTaskRequestDto, headers);
        serverId = task.id;
        break;
      }
      case "CREATE_NOTE": {
        const note = await createNote(mutation.payload as CreateNoteRequestDto, headers);
        serverId = note.id;
        break;
      }
      case "CREATE_BRAIN_DUMP_ITEM": {
        const item = await captureBrainDumpItem(
          mutation.payload as CaptureBrainDumpRequestDto,
          headers,
        );
        serverId = item.id;
        break;
      }
      default: {
        return {
          success: false,
          error: `Unsupported mutation type '${(mutation as QueuedMutation).type}'`,
          isConflict: false,
        };
      }
    }

    return {
      success: true,
      serverId,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return {
        success: false,
        error: error.message || "Sync conflict (409)",
        isConflict: true,
      };
    }

    const message = error instanceof Error ? error.message : "Network error during replay";
    return {
      success: false,
      error: message,
      isConflict: false,
    };
  }
}

export async function replayMutationQueue(
  userId: string,
  options: ReplayQueueOptions = {},
): Promise<ReplayQueueResult> {
  if (!userId) {
    return { total: 0, succeeded: 0, failed: 0, conflict: 0, items: [] };
  }

  const allMutations = listQueuedMutations(userId);
  const pendingMutations = allMutations.filter(
    (item) => item.status === "queued" || item.status === "failed",
  );

  let succeeded = 0;
  let failed = 0;
  let conflict = 0;

  for (const mutation of pendingMutations) {
    // Check if entry still exists in storage (might have been removed or expired)
    const current = getQueuedMutation(userId, mutation.id);
    if (!current) {
      continue;
    }

    // Mark as syncing in storage
    updateQueuedMutationStatus(userId, mutation.id, "syncing");

    const result = await replaySingleMutation(mutation);

    if (result.success) {
      succeeded++;
      deleteQueuedMutation(userId, mutation.id);
      options.onMutationReplayed?.(
        { ...mutation, status: "queued", serverId: result.serverId ?? null },
        result,
      );
    } else if (result.isConflict) {
      conflict++;
      const updated = updateQueuedMutationStatus(
        userId,
        mutation.id,
        "conflict",
        result.error ?? "Sync conflict (409)",
      );
      if (updated) {
        options.onMutationReplayed?.(updated, result);
      }
    } else {
      failed++;
      const updated = updateQueuedMutationStatus(
        userId,
        mutation.id,
        "failed",
        result.error ?? "Replay failed",
        null,
        true, // Increment attempt count
      );
      if (updated) {
        options.onMutationReplayed?.(updated, result);
      }
    }
  }

  const finalItems = listQueuedMutations(userId);
  return {
    total: pendingMutations.length,
    succeeded,
    failed,
    conflict,
    items: finalItems,
  };
}
