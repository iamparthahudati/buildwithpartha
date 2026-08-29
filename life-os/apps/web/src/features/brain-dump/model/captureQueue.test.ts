import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  readCaptureQueue,
  writeCaptureQueue,
  enqueueCapture,
  removeQueuedCapture,
  clearCaptureQueue,
  type QueuedCapture,
} from "./captureQueue";

const USER_A = "user-a";
const USER_B = "user-b";

describe("captureQueue", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty queue when nothing is stored", () => {
    expect(readCaptureQueue(USER_A)).toEqual([]);
  });

  it("enqueues captures, trims content, and persists across reads", () => {
    enqueueCapture(USER_A, "  first thought  ", () => "2026-08-30T10:00:00Z");
    const queue = enqueueCapture(USER_A, "second thought", () => "2026-08-30T10:01:00Z");

    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({ content: "first thought", queuedAt: "2026-08-30T10:00:00Z" });
    expect(queue[1]).toMatchObject({ content: "second thought" });
    // Persisted, so a fresh read sees the same items.
    expect(readCaptureQueue(USER_A)).toHaveLength(2);
  });

  it("ignores blank captures", () => {
    const queue = enqueueCapture(USER_A, "   ");
    expect(queue).toEqual([]);
    expect(readCaptureQueue(USER_A)).toEqual([]);
  });

  it("keeps each user's queue isolated", () => {
    enqueueCapture(USER_A, "a-item");
    enqueueCapture(USER_B, "b-item");

    expect(readCaptureQueue(USER_A).map((q) => q.content)).toEqual(["a-item"]);
    expect(readCaptureQueue(USER_B).map((q) => q.content)).toEqual(["b-item"]);
  });

  it("removes a single queued capture by id", () => {
    enqueueCapture(USER_A, "keep");
    const [, second] = enqueueCapture(USER_A, "drop") as [QueuedCapture, QueuedCapture];

    const next = removeQueuedCapture(USER_A, second.id);
    expect(next.map((q) => q.content)).toEqual(["keep"]);
  });

  it("clears the whole queue and removes the storage key", () => {
    enqueueCapture(USER_A, "one");
    enqueueCapture(USER_A, "two");
    clearCaptureQueue(USER_A);

    expect(readCaptureQueue(USER_A)).toEqual([]);
    expect(window.localStorage.getItem("lifeos.brain-dump.capture-queue.user-a")).toBeNull();
  });

  it("tolerates corrupt stored data", () => {
    window.localStorage.setItem("lifeos.brain-dump.capture-queue.user-a", "{not json");
    expect(readCaptureQueue(USER_A)).toEqual([]);
  });

  it("filters out malformed entries", () => {
    window.localStorage.setItem(
      "lifeos.brain-dump.capture-queue.user-a",
      JSON.stringify([{ id: "x", content: "ok", queuedAt: "t" }, { id: 1 }, "nope"]),
    );
    expect(readCaptureQueue(USER_A)).toEqual([{ id: "x", content: "ok", queuedAt: "t" }]);
  });

  it("does not throw when writing to unavailable storage", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() =>
      writeCaptureQueue(USER_A, [{ id: "x", content: "c", queuedAt: "t" }]),
    ).not.toThrow();
    setItem.mockRestore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
