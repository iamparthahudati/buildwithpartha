import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createQueuedMutation } from "../model/mutationQueue";
import {
  clearAllMutationQueues,
  clearUserMutationQueue,
  decryptQueuePayload,
  deleteQueuedMutation,
  encryptQueuePayload,
  getQueuedMutation,
  listQueuedMutations,
  saveQueuedMutation,
  updateQueuedMutationStatus,
} from "../model/queueStorage";

describe("queueStorage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T10:00:00Z"));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("encrypts and decrypts payload with salt", () => {
    const raw = JSON.stringify({ title: "Secret note payload" });
    const salt = "user-100-lifeos-queue-salt";

    const encrypted = encryptQueuePayload(raw, salt);
    expect(encrypted).not.toBe(raw);

    const decrypted = decryptQueuePayload(encrypted, salt);
    expect(decrypted).toBe(raw);
  });

  it("saves, retrieves, and lists queued mutations for a specific user", () => {
    const m1 = createQueuedMutation({
      userId: "user-100",
      type: "CREATE_TASK",
      endpoint: "/tasks",
      payload: { title: "Task 1" },
      now: new Date("2026-09-02T10:00:00Z"),
    });

    const m2 = createQueuedMutation({
      userId: "user-100",
      type: "CREATE_NOTE",
      endpoint: "/notes",
      payload: { title: "Note 1" },
      now: new Date("2026-09-02T11:00:00Z"),
    });

    saveQueuedMutation(m1);
    saveQueuedMutation(m2);

    const retrieved1 = getQueuedMutation("user-100", m1.id);
    expect(retrieved1).toEqual(m1);

    const user100Mutations = listQueuedMutations("user-100");
    expect(user100Mutations).toHaveLength(2);
    expect(user100Mutations[0]!.id).toBe(m1.id);
    expect(user100Mutations[1]!.id).toBe(m2.id);

    // Isolated from user-200
    const user200Mutations = listQueuedMutations("user-200");
    expect(user200Mutations).toHaveLength(0);
  });

  it("updates mutation status and attempt count", () => {
    const mutation = createQueuedMutation({
      userId: "user-100",
      type: "CREATE_BRAIN_DUMP_ITEM",
      endpoint: "/brain-dump-items",
      payload: { content: "Draft item" },
    });
    saveQueuedMutation(mutation);

    const updated = updateQueuedMutationStatus(
      "user-100",
      mutation.id,
      "failed",
      "Network connection lost",
      null,
      true,
    );

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("failed");
    expect(updated!.lastError).toBe("Network connection lost");
    expect(updated!.attemptCount).toBe(1);
  });

  it("deletes a queued mutation", () => {
    const mutation = createQueuedMutation({
      userId: "user-100",
      type: "CREATE_TASK",
      endpoint: "/tasks",
      payload: { title: "Task to delete" },
    });
    saveQueuedMutation(mutation);

    const deleted = deleteQueuedMutation("user-100", mutation.id);
    expect(deleted).toBe(true);
    expect(getQueuedMutation("user-100", mutation.id)).toBeNull();
  });

  it("clears user mutation queue and all queues", () => {
    const m1 = createQueuedMutation({
      userId: "user-100",
      type: "CREATE_TASK",
      endpoint: "/tasks",
      payload: { title: "Task U1" },
    });

    const m2 = createQueuedMutation({
      userId: "user-200",
      type: "CREATE_NOTE",
      endpoint: "/notes",
      payload: { title: "Note U2" },
    });

    saveQueuedMutation(m1);
    saveQueuedMutation(m2);

    expect(clearUserMutationQueue("user-100")).toBe(1);
    expect(listQueuedMutations("user-100")).toHaveLength(0);
    expect(listQueuedMutations("user-200")).toHaveLength(1);

    expect(clearAllMutationQueues()).toBe(1);
    expect(listQueuedMutations("user-200")).toHaveLength(0);
  });
});
