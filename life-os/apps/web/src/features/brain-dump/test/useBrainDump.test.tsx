import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TODAY_QUERY_KEY } from "@features/today";
import * as brainDumpApi from "../api/brainDumpApi";
import {
  runBatchConvert,
  useArchiveBrainDumpItem,
  useBrainDumpBatchConvert,
  useBrainDumpItems,
  useCaptureBrainDumpItem,
  useConvertBrainDumpItem,
  useDeferBrainDumpItem,
  useDeleteBrainDumpItem,
  useRestoreBrainDumpItem,
  useUpdateBrainDumpContent,
} from "../hooks/useBrainDump";
import type { BrainDumpItem } from "../model/brainDumpItem";

vi.mock("@features/activity", () => ({ invalidateActivityQueries: vi.fn() }));
vi.mock("../api/brainDumpApi", async () => {
  const actual = await vi.importActual<typeof brainDumpApi>("../api/brainDumpApi");
  return {
    ...actual,
    queryBrainDumpItems: vi.fn(),
    captureBrainDumpItem: vi.fn(),
    updateBrainDumpContent: vi.fn(),
    deferBrainDumpItem: vi.fn(),
    archiveBrainDumpItem: vi.fn(),
    restoreBrainDumpItem: vi.fn(),
    deleteBrainDumpItem: vi.fn(),
    convertBrainDumpByTarget: vi.fn(),
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
    vi.resetAllMocks();
    vi.mocked(brainDumpApi.queryBrainDumpItems).mockResolvedValue({
      items: [ITEM],
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    });
    vi.mocked(brainDumpApi.captureBrainDumpItem).mockResolvedValue(ITEM);
    vi.mocked(brainDumpApi.updateBrainDumpContent).mockResolvedValue(ITEM);
    vi.mocked(brainDumpApi.deferBrainDumpItem).mockResolvedValue(ITEM);
    vi.mocked(brainDumpApi.archiveBrainDumpItem).mockResolvedValue(ITEM);
    vi.mocked(brainDumpApi.restoreBrainDumpItem).mockResolvedValue(ITEM);
    vi.mocked(brainDumpApi.deleteBrainDumpItem).mockResolvedValue(undefined);
    vi.mocked(brainDumpApi.convertBrainDumpByTarget).mockResolvedValue({
      ...ITEM,
      status: "CONVERTED",
      convertedToType: "NOTE",
      convertedToId: "note-1",
    });
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

  it("runs the query and every lifecycle mutation through the canonical API", async () => {
    const { wrapper } = harness();
    const query = renderHook(() => useBrainDumpItems({ status: "UNPROCESSED" }), { wrapper });
    await waitFor(() => expect(query.result.current.isSuccess).toBe(true));

    const deferMutation = renderHook(() => useDeferBrainDumpItem(), { wrapper });
    const archiveMutation = renderHook(() => useArchiveBrainDumpItem(), { wrapper });
    const restoreMutation = renderHook(() => useRestoreBrainDumpItem(), { wrapper });
    const deleteMutation = renderHook(() => useDeleteBrainDumpItem(), { wrapper });
    const convertMutation = renderHook(() => useConvertBrainDumpItem(), { wrapper });

    await act(async () => {
      await deferMutation.result.current.mutateAsync({ id: ITEM.id, version: 0 });
      await archiveMutation.result.current.mutateAsync({ id: ITEM.id, version: 0 });
      await restoreMutation.result.current.mutateAsync({ id: ITEM.id, version: 0 });
      await deleteMutation.result.current.mutateAsync(ITEM.id);
      await convertMutation.result.current.mutateAsync({
        id: ITEM.id,
        target: "NOTE",
        request: { title: "Thought", body: "Thought", labelIds: [], version: 0 },
      });
    });

    expect(brainDumpApi.queryBrainDumpItems).toHaveBeenCalled();
    expect(brainDumpApi.deferBrainDumpItem).toHaveBeenCalledWith(ITEM.id, 0);
    expect(brainDumpApi.archiveBrainDumpItem).toHaveBeenCalledWith(ITEM.id, 0);
    expect(brainDumpApi.restoreBrainDumpItem).toHaveBeenCalledWith(ITEM.id, 0);
    expect(brainDumpApi.deleteBrainDumpItem).toHaveBeenCalledWith(ITEM.id);
    expect(brainDumpApi.convertBrainDumpByTarget).toHaveBeenCalled();
  });

  it("reports partial batch results and runs the batch mutation invalidation", async () => {
    vi.mocked(brainDumpApi.convertBrainDumpByTarget)
      .mockResolvedValueOnce({ ...ITEM, status: "CONVERTED" })
      .mockRejectedValueOnce(new Error("second failed"));
    const second = { ...ITEM, id: "item-2", content: "Second" };

    const direct = await runBatchConvert({ items: [ITEM, second], target: "NOTE" });
    expect(direct.successCount).toBe(1);
    expect(direct.failureCount).toBe(1);
    expect(direct.results[1]).toMatchObject({ ok: false, error: "second failed" });

    vi.mocked(brainDumpApi.convertBrainDumpByTarget).mockResolvedValue({
      ...ITEM,
      status: "CONVERTED",
    });
    const { wrapper } = harness();
    const mutation = renderHook(() => useBrainDumpBatchConvert(), { wrapper });
    await act(async () => {
      await mutation.result.current.mutateAsync({ items: [ITEM], target: "TASK" });
    });
    await waitFor(() => expect(mutation.result.current.data?.successCount).toBe(1));
  });
});
