import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useTimeBlocks,
  useTimeBlock,
  useCreateTimeBlock,
  useUpdateTimeBlock,
  useMoveTimeBlock,
  useResizeTimeBlock,
  useCompleteTimeBlock,
  useDuplicateTimeBlock,
  useDeleteTimeBlock,
} from "../index";
import * as timeBlocksApi from "../api/timeBlocksApi";
import type { TimeBlock } from "../model/timeBlock";

vi.mock("../api/timeBlocksApi", () => ({
  queryTimeBlocks: vi.fn(),
  getTimeBlock: vi.fn(),
  createTimeBlock: vi.fn(),
  updateTimeBlock: vi.fn(),
  moveTimeBlock: vi.fn(),
  resizeTimeBlock: vi.fn(),
  changeTimeBlockStatus: vi.fn(),
  completeTimeBlock: vi.fn(),
  duplicateTimeBlock: vi.fn(),
  deleteTimeBlock: vi.fn(),
  checkTimeBlockOverlap: vi.fn(),
  mapTimeBlockResponse: vi.fn(),
  localDateTimeToInstantIso: vi.fn(),
  instantToLocalDate: vi.fn(),
  instantToLocalTime: vi.fn(),
}));

const mockQueryTimeBlocks = vi.mocked(timeBlocksApi.queryTimeBlocks);
const mockGetTimeBlock = vi.mocked(timeBlocksApi.getTimeBlock);
const mockCreateTimeBlock = vi.mocked(timeBlocksApi.createTimeBlock);
const mockUpdateTimeBlock = vi.mocked(timeBlocksApi.updateTimeBlock);
const mockMoveTimeBlock = vi.mocked(timeBlocksApi.moveTimeBlock);
const mockResizeTimeBlock = vi.mocked(timeBlocksApi.resizeTimeBlock);
const mockCompleteTimeBlock = vi.mocked(timeBlocksApi.completeTimeBlock);
const mockDuplicateTimeBlock = vi.mocked(timeBlocksApi.duplicateTimeBlock);
const mockDeleteTimeBlock = vi.mocked(timeBlocksApi.deleteTimeBlock);

const MOCK_BLOCK: TimeBlock = {
  id: "tb-101",
  title: "Hook Test Time Block",
  category: "Focus",
  status: "SCHEDULED",
  date: "2026-08-24",
  startTime: "09:00",
  endTime: "10:00",
  timeZone: "UTC",
  version: 1,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
}

describe("useTimeBlocks and mutations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("useTimeBlocks", () => {
    it("fetches time blocks", async () => {
      mockQueryTimeBlocks.mockResolvedValueOnce({
        items: [MOCK_BLOCK],
        totalCount: 1,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useTimeBlocks({ date: "2026-08-24" }), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.items).toHaveLength(1);
      expect(result.current.data?.items[0]?.title).toBe("Hook Test Time Block");
    });
  });

  describe("useTimeBlock", () => {
    it("fetches single time block", async () => {
      mockGetTimeBlock.mockResolvedValueOnce(MOCK_BLOCK);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useTimeBlock("tb-101"), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.title).toBe("Hook Test Time Block");
    });
  });

  describe("useCreateTimeBlock", () => {
    it("calls createTimeBlock and invalidates caches", async () => {
      mockCreateTimeBlock.mockResolvedValueOnce(MOCK_BLOCK);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateTimeBlock(), { wrapper: Wrapper });

      result.current.mutate({
        title: "New Block",
        category: "Focus",
        startAt: "2026-08-24T09:00:00Z",
        endAt: "2026-08-24T10:00:00Z",
        sourceTimeZone: "UTC",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateTimeBlock).toHaveBeenCalled();
    });
  });

  describe("useUpdateTimeBlock", () => {
    it("calls updateTimeBlock", async () => {
      mockUpdateTimeBlock.mockResolvedValueOnce(MOCK_BLOCK);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateTimeBlock(), { wrapper: Wrapper });

      result.current.mutate({
        id: "tb-101",
        request: {
          title: "Updated",
          category: "Focus",
          status: "SCHEDULED",
          startAt: "2026-08-24T09:00:00Z",
          endAt: "2026-08-24T10:00:00Z",
          sourceTimeZone: "UTC",
          version: 1,
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateTimeBlock).toHaveBeenCalledWith("tb-101", expect.anything());
    });
  });

  describe("useMoveTimeBlock", () => {
    it("calls moveTimeBlock", async () => {
      mockMoveTimeBlock.mockResolvedValueOnce(MOCK_BLOCK);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useMoveTimeBlock(), { wrapper: Wrapper });

      result.current.mutate({
        id: "tb-101",
        request: {
          startAt: "2026-08-24T10:00:00Z",
          endAt: "2026-08-24T11:00:00Z",
          version: 1,
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockMoveTimeBlock).toHaveBeenCalled();
    });
  });

  describe("useResizeTimeBlock", () => {
    it("calls resizeTimeBlock", async () => {
      mockResizeTimeBlock.mockResolvedValueOnce(MOCK_BLOCK);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useResizeTimeBlock(), { wrapper: Wrapper });

      result.current.mutate({
        id: "tb-101",
        request: {
          startAt: "2026-08-24T09:00:00Z",
          endAt: "2026-08-24T11:00:00Z",
          version: 1,
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockResizeTimeBlock).toHaveBeenCalled();
    });
  });

  describe("useCompleteTimeBlock", () => {
    it("calls completeTimeBlock", async () => {
      mockCompleteTimeBlock.mockResolvedValueOnce({ ...MOCK_BLOCK, status: "COMPLETED" });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCompleteTimeBlock(), { wrapper: Wrapper });

      result.current.mutate({ id: "tb-101", version: 1 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCompleteTimeBlock).toHaveBeenCalledWith("tb-101", 1);
    });
  });

  describe("useDuplicateTimeBlock", () => {
    it("calls duplicateTimeBlock", async () => {
      mockDuplicateTimeBlock.mockResolvedValueOnce({ ...MOCK_BLOCK, id: "tb-102" });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useDuplicateTimeBlock(), { wrapper: Wrapper });

      result.current.mutate({ id: "tb-101" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDuplicateTimeBlock).toHaveBeenCalledWith("tb-101", undefined);
    });
  });

  describe("useDeleteTimeBlock", () => {
    it("calls deleteTimeBlock", async () => {
      mockDeleteTimeBlock.mockResolvedValueOnce(undefined);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteTimeBlock(), { wrapper: Wrapper });

      result.current.mutate("tb-101");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteTimeBlock).toHaveBeenCalledWith("tb-101");
    });
  });
});
