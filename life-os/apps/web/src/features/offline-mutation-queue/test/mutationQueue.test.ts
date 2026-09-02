import { describe, expect, it } from "vitest";

import {
  createQueuedMutation,
  generateClientUuid,
  generateIdempotencyKey,
  isAllowedMutationType,
  isMutationExpired,
} from "../model/mutationQueue";

describe("mutationQueue model", () => {
  it("validates allowed creation mutation types", () => {
    expect(isAllowedMutationType("CREATE_TASK")).toBe(true);
    expect(isAllowedMutationType("CREATE_NOTE")).toBe(true);
    expect(isAllowedMutationType("CREATE_BRAIN_DUMP_ITEM")).toBe(true);
    expect(isAllowedMutationType("UPDATE_TASK")).toBe(false);
    expect(isAllowedMutationType("DELETE_NOTE")).toBe(false);
    expect(isAllowedMutationType("START_FOCUS_SESSION")).toBe(false);
  });

  it("generates valid client UUIDs and idempotency keys", () => {
    const uuid = generateClientUuid();
    expect(uuid).toBeDefined();
    expect(uuid.length).toBeGreaterThan(5);

    const ik = generateIdempotencyKey("CREATE_TASK", uuid);
    expect(ik).toMatch(/^ik-create-task-/);
    expect(ik.length).toBeGreaterThanOrEqual(8);
    expect(ik.length).toBeLessThanOrEqual(64);
  });

  it("creates queued mutation with default 7-day expiry and queued status", () => {
    const now = new Date("2026-09-02T12:00:00Z");
    const mutation = createQueuedMutation({
      userId: "user-100",
      type: "CREATE_TASK",
      endpoint: "/tasks",
      payload: { title: "Test Task" },
      now,
    });

    expect(mutation.id).toBeDefined();
    expect(mutation.userId).toBe("user-100");
    expect(mutation.type).toBe("CREATE_TASK");
    expect(mutation.endpoint).toBe("/tasks");
    expect(mutation.payload).toEqual({ title: "Test Task" });
    expect(mutation.status).toBe("queued");
    expect(mutation.attemptCount).toBe(0);
    expect(mutation.createdAt).toBe("2026-09-02T12:00:00.000Z");
    expect(mutation.expiresAt).toBe("2026-09-09T12:00:00.000Z");
  });

  it("rejects disallowed offline mutation types on creation", () => {
    expect(() =>
      createQueuedMutation({
        userId: "user-100",
        type: "UPDATE_TASK" as any,
        endpoint: "/tasks/1",
        payload: { title: "Updated" },
      }),
    ).toThrow(/is not allowed offline/);
  });

  it("rejects empty userId", () => {
    expect(() =>
      createQueuedMutation({
        userId: "",
        type: "CREATE_TASK",
        endpoint: "/tasks",
        payload: { title: "Test" },
      }),
    ).toThrow(/User ID is required/);
  });

  it("detects expired mutations correctly", () => {
    const now = new Date("2026-09-02T12:00:00Z");
    const validMutation = createQueuedMutation({
      userId: "user-100",
      type: "CREATE_TASK",
      endpoint: "/tasks",
      payload: {},
      now,
      expiryDays: 7,
    });

    expect(isMutationExpired(validMutation, now)).toBe(false);

    const eightDaysLater = new Date("2026-09-10T12:00:00Z");
    expect(isMutationExpired(validMutation, eightDaysLater)).toBe(true);
  });
});
