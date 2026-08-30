import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TODAY_QUERY_KEY } from "@features/today";
import * as brainDumpApi from "../api/brainDumpApi";
import { useCaptureBrainDumpItem, useUpdateBrainDumpContent } from "../hooks/useBrainDump";
import type { BrainDumpItem } from "../model/brainDumpItem";

vi.mock("@features/activity", () => ({ invalidateActivityQueries: vi.fn() }));
vi.mock("../api/brainDumpApi", async () => {
  const actual = await vi.importActual<typeof brainDumpApi>("../api/brainDumpApi");
  return {
    ...actual,
    captureBrainDumpItem: vi.fn(),
    updateBrainDumpContent: vi.fn(),
  };
});

const ITEM: BrainDumpItem = {
  id: "item-1",
  userId: "user-1",
  content: "Thought",
  status: "UNPROCESSED",
  archived: false,
  version: 0,
  convertedToType: null,
  convertedToId: null,
  convertedAt: null,
  archivedAt: null,
  createdAt: "2026-08-30T10:00:00Z",
  updatedAt: "2026-08-30T10:00:00Z",
};

function harness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { invalidate, wrapper };
}

describe("Brain Dump mutation invalidation", () => {
  beforeEach(() => {
    vi.mocked(brainDumpApi.captureBrainDumpItem).mockResolvedValue(ITEM);
    vi.mocked(brainDumpApi.updateBrainDumpContent).mockResolvedValue(ITEM);
  });

  it("invalidates Today after a capture changes the unprocessed count", async () => {
    const { invalidate, wrapper } = harness();
    const { result } = renderHook(() => useCaptureBrainDumpItem(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ content: "Thought" });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: TODAY_QUERY_KEY });
  });

  it("does not invalidate Today for a content-only edit", async () => {
    const { invalidate, wrapper } = harness();
    const { result } = renderHook(() => useUpdateBrainDumpContent(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: ITEM.id,
        request: { content: "Updated", version: ITEM.version },
      });
    });

    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: TODAY_QUERY_KEY });
  });
});
