import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest } from "@lib/apiClient";
import {
  mapTimeBlockResponse,
  queryTimeBlocks,
  getTimeBlock,
  createTimeBlock,
  updateTimeBlock,
  moveTimeBlock,
  resizeTimeBlock,
  changeTimeBlockStatus,
  completeTimeBlock,
  duplicateTimeBlock,
  deleteTimeBlock,
  checkTimeBlockOverlap,
  localDateTimeToInstantIso,
  instantToLocalDate,
  instantToLocalTime,
  type TimeBlockResponseDto,
  type TimeBlockQueryResponseDto,
} from "../api/timeBlocksApi";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

const MOCK_DTO: TimeBlockResponseDto = {
  id: "tb-100",
  userId: "user-1",
  projectId: "proj-1",
  taskId: "task-1",
  title: "Deep Work API Integration",
  category: "Focus",
  status: "SCHEDULED",
  startAt: "2026-08-24T09:00:00Z",
  endAt: "2026-08-24T11:00:00Z",
  sourceTimeZone: "UTC",
  notes: "Focus notes",
  durationMinutes: 120,
  isOvernight: false,
  spansDstTransition: false,
  createdAt: "2026-08-24T08:00:00Z",
  updatedAt: "2026-08-24T08:00:00Z",
  version: 1,
};

describe("timeBlocksApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("date and time conversion utilities", () => {
    it("converts local date/time in timezone to instant ISO and back", () => {
      const date = "2026-08-24";
      const time = "09:00";
      const timeZone = "UTC";

      const iso = localDateTimeToInstantIso(date, time, timeZone);
      expect(iso).toBe("2026-08-24T09:00:00.000Z");

      expect(instantToLocalDate(iso, timeZone)).toBe("2026-08-24");
      expect(instantToLocalTime(iso, timeZone)).toBe("09:00");
    });
  });

  describe("mapTimeBlockResponse", () => {
    it("maps TimeBlockResponseDto to TimeBlock domain object", () => {
      const block = mapTimeBlockResponse(MOCK_DTO, "UTC");

      expect(block.id).toBe("tb-100");
      expect(block.title).toBe("Deep Work API Integration");
      expect(block.category).toBe("Focus");
      expect(block.status).toBe("SCHEDULED");
      expect(block.completed).toBe(false);
      expect(block.date).toBe("2026-08-24");
      expect(block.startTime).toBe("09:00");
      expect(block.endTime).toBe("11:00");
      expect(block.projectId).toBe("proj-1");
      expect(block.taskId).toBe("task-1");
      expect(block.notes).toBe("Focus notes");
      expect(block.version).toBe(1);
    });
  });

  describe("queryTimeBlocks", () => {
    it("fetches time blocks with query parameters", async () => {
      const mockResponse: TimeBlockQueryResponseDto = {
        timeBlocks: [MOCK_DTO],
        totalCount: 1,
      };
      mockApiRequest.mockResolvedValueOnce(mockResponse);

      const res = await queryTimeBlocks({ date: "2026-08-24", timeZone: "UTC" });

      expect(mockApiRequest).toHaveBeenCalledWith("/time-blocks?date=2026-08-24&timeZone=UTC", {
        method: "GET",
      });
      expect(res.items).toHaveLength(1);
      expect(res.items[0]?.title).toBe("Deep Work API Integration");
    });
  });

  describe("getTimeBlock", () => {
    it("fetches single time block by ID", async () => {
      mockApiRequest.mockResolvedValueOnce(MOCK_DTO);

      const block = await getTimeBlock("tb-100");

      expect(mockApiRequest).toHaveBeenCalledWith("/time-blocks/tb-100", { method: "GET" });
      expect(block.id).toBe("tb-100");
    });
  });

  describe("createTimeBlock", () => {
    it("sends POST request to create time block", async () => {
      mockApiRequest.mockResolvedValueOnce(MOCK_DTO);

      const created = await createTimeBlock({
        title: "Deep Work API Integration",
        category: "Focus",
        startAt: "2026-08-24T09:00:00Z",
        endAt: "2026-08-24T11:00:00Z",
        sourceTimeZone: "UTC",
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/time-blocks", {
        method: "POST",
        body: {
          title: "Deep Work API Integration",
          category: "Focus",
          startAt: "2026-08-24T09:00:00Z",
          endAt: "2026-08-24T11:00:00Z",
          sourceTimeZone: "UTC",
        },
      });
      expect(created.id).toBe("tb-100");
    });
  });

  describe("updateTimeBlock", () => {
    it("sends PUT request to update time block", async () => {
      mockApiRequest.mockResolvedValueOnce({ ...MOCK_DTO, version: 2 });

      const updated = await updateTimeBlock("tb-100", {
        title: "Updated Deep Work",
        category: "Focus",
        status: "SCHEDULED",
        startAt: "2026-08-24T09:00:00Z",
        endAt: "2026-08-24T11:00:00Z",
        sourceTimeZone: "UTC",
        version: 1,
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/time-blocks/tb-100", {
        method: "PUT",
        body: {
          title: "Updated Deep Work",
          category: "Focus",
          status: "SCHEDULED",
          startAt: "2026-08-24T09:00:00Z",
          endAt: "2026-08-24T11:00:00Z",
          sourceTimeZone: "UTC",
          version: 1,
        },
      });
      expect(updated.version).toBe(2);
    });
  });

  describe("moveTimeBlock", () => {
    it("sends PATCH request to move endpoint", async () => {
      mockApiRequest.mockResolvedValueOnce(MOCK_DTO);

      await moveTimeBlock("tb-100", {
        startAt: "2026-08-24T10:00:00Z",
        endAt: "2026-08-24T12:00:00Z",
        version: 1,
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/time-blocks/tb-100/move", {
        method: "PATCH",
        body: {
          startAt: "2026-08-24T10:00:00Z",
          endAt: "2026-08-24T12:00:00Z",
          version: 1,
        },
      });
    });
  });

  describe("resizeTimeBlock", () => {
    it("sends PATCH request to resize endpoint", async () => {
      mockApiRequest.mockResolvedValueOnce(MOCK_DTO);

      await resizeTimeBlock("tb-100", {
        startAt: "2026-08-24T09:00:00Z",
        endAt: "2026-08-24T12:00:00Z",
        version: 1,
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/time-blocks/tb-100/resize", {
        method: "PATCH",
        body: {
          startAt: "2026-08-24T09:00:00Z",
          endAt: "2026-08-24T12:00:00Z",
          version: 1,
        },
      });
    });
  });

  describe("changeTimeBlockStatus", () => {
    it("sends PATCH request to status endpoint", async () => {
      mockApiRequest.mockResolvedValueOnce({ ...MOCK_DTO, status: "IN_PROGRESS" });

      const res = await changeTimeBlockStatus("tb-100", {
        status: "IN_PROGRESS",
        version: 1,
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/time-blocks/tb-100/status", {
        method: "PATCH",
        body: { status: "IN_PROGRESS", version: 1 },
      });
      expect(res.status).toBe("IN_PROGRESS");
    });
  });

  describe("completeTimeBlock", () => {
    it("sends POST request to complete endpoint", async () => {
      mockApiRequest.mockResolvedValueOnce({ ...MOCK_DTO, status: "COMPLETED" });

      const res = await completeTimeBlock("tb-100", 1);

      expect(mockApiRequest).toHaveBeenCalledWith("/time-blocks/tb-100/complete?version=1", {
        method: "POST",
      });
      expect(res.completed).toBe(true);
    });
  });

  describe("duplicateTimeBlock", () => {
    it("sends POST request to duplicate endpoint", async () => {
      mockApiRequest.mockResolvedValueOnce({ ...MOCK_DTO, id: "tb-101" });

      const res = await duplicateTimeBlock("tb-100");

      expect(mockApiRequest).toHaveBeenCalledWith("/time-blocks/tb-100/duplicate", {
        method: "POST",
        body: {},
      });
      expect(res.id).toBe("tb-101");
    });
  });

  describe("deleteTimeBlock", () => {
    it("sends DELETE request", async () => {
      mockApiRequest.mockResolvedValueOnce(undefined);

      await deleteTimeBlock("tb-100");

      expect(mockApiRequest).toHaveBeenCalledWith("/time-blocks/tb-100", { method: "DELETE" });
    });
  });

  describe("checkTimeBlockOverlap", () => {
    it("sends POST request to check-overlap endpoint", async () => {
      mockApiRequest.mockResolvedValueOnce({
        hasConflict: false,
        conflictingBlocks: [],
      });

      const res = await checkTimeBlockOverlap({
        startAt: "2026-08-24T09:00:00Z",
        endAt: "2026-08-24T11:00:00Z",
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/time-blocks/check-overlap", {
        method: "POST",
        body: {
          startAt: "2026-08-24T09:00:00Z",
          endAt: "2026-08-24T11:00:00Z",
        },
      });
      expect(res.hasConflict).toBe(false);
    });
  });
});
