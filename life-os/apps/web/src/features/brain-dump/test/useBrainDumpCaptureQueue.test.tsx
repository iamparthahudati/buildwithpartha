import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as brainDumpApi from "../api/brainDumpApi";
import { useBrainDumpCaptureQueue } from "../hooks/useBrainDumpCaptureQueue";
import { readCaptureQueue } from "../model/captureQueue";
import type { BrainDumpItem } from "../model/brainDumpItem";

vi.mock("@features/activity", () => ({ invalidateActivityQueries: vi.fn() }));

vi.mock("../api/brainDumpApi", async () => {
  const actual = await vi.importActual<typeof brainDumpApi>("../api/brainDumpApi");
  return { ...actual, captureBrainDumpItem: vi.fn() };
});

const mockCapture = vi.mocked(brainDumpApi.captureBrainDumpItem);

const USER = "user-1";

const madeItem = (content: string): BrainDumpItem => ({
  id: `item-${content}`,
  userId: USER,
  content,
  status: "UNPROCESSED",
  archived: false,
  version: 0,
  convertedToType: null,
  convertedToId: null,
  convertedAt: null,
  archivedAt: null,
  createdAt: "2026-08-30T10:00:00Z",
  updatedAt: "2026-08-30T10:00:00Z",
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

describe("useBrainDumpCaptureQueue", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("rehydrates the persisted queue on mount", () => {
    window.localStorage.setItem(
      "lifeos.brain-dump.capture-queue.user-1",
      JSON.stringify([{ id: "a", content: "leftover", queuedAt: "t" }]),
    );
    const { result } = renderHook(
      () => useBrainDumpCaptureQueue({ userId: USER, isOnline: false }),
      { wrapper: createWrapper() },
    );
    expect(result.current.queuedCount).toBe(1);
    expect(result.current.queuedItems[0]?.content).toBe("leftover");
  });

  it("persists an enqueued capture while offline", () => {
    const { result } = renderHook(
      () => useBrainDumpCaptureQueue({ userId: USER, isOnline: false }),
      { wrapper: createWrapper() },
    );
    act(() => result.current.enqueue("offline thought"));
    expect(result.current.queuedCount).toBe(1);
    expect(readCaptureQueue(USER).map((q) => q.content)).toEqual(["offline thought"]);
  });

  it("auto-flushes queued captures when online", async () => {
    window.localStorage.setItem(
      "lifeos.brain-dump.capture-queue.user-1",
      JSON.stringify([
        { id: "a", content: "one", queuedAt: "t1" },
        { id: "b", content: "two", queuedAt: "t2" },
      ]),
    );
    mockCapture.mockImplementation((req) => Promise.resolve(madeItem(req.content)));

    const { result } = renderHook(
      () => useBrainDumpCaptureQueue({ userId: USER, isOnline: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.queuedCount).toBe(0));
    expect(mockCapture).toHaveBeenCalledTimes(2);
    expect(readCaptureQueue(USER)).toEqual([]);
  });

  it("keeps captures that fail to send and reports the remainder", async () => {
    mockCapture.mockResolvedValueOnce(madeItem("one")).mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(
      () => useBrainDumpCaptureQueue({ userId: USER, isOnline: false }),
      { wrapper: createWrapper() },
    );
    act(() => result.current.enqueue("one"));
    act(() => result.current.enqueue("two"));

    let flushResult: { sent: number; remaining: number } | undefined;
    await act(async () => {
      flushResult = await result.current.flush();
    });

    expect(flushResult).toEqual({ sent: 1, remaining: 1 });
    expect(result.current.queuedCount).toBe(1);
    expect(readCaptureQueue(USER).map((q) => q.content)).toEqual(["two"]);
  });

  it("discards all queued captures", () => {
    const { result } = renderHook(
      () => useBrainDumpCaptureQueue({ userId: USER, isOnline: false }),
      { wrapper: createWrapper() },
    );
    act(() => result.current.enqueue("one"));
    act(() => result.current.discardAll());
    expect(result.current.queuedCount).toBe(0);
    expect(readCaptureQueue(USER)).toEqual([]);
  });

  it("stays dormant when disabled", () => {
    window.localStorage.setItem(
      "lifeos.brain-dump.capture-queue.user-1",
      JSON.stringify([{ id: "a", content: "leftover", queuedAt: "t" }]),
    );
    const { result } = renderHook(
      () => useBrainDumpCaptureQueue({ userId: USER, isOnline: true, enabled: false }),
      { wrapper: createWrapper() },
    );
    expect(result.current.queuedCount).toBe(0);
    expect(mockCapture).not.toHaveBeenCalled();
  });
});
