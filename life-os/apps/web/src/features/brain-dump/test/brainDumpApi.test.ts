import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest } from "@lib/apiClient";
import {
  queryBrainDumpItems,
  getBrainDumpItem,
  captureBrainDumpItem,
  updateBrainDumpContent,
  deferBrainDumpItem,
  archiveBrainDumpItem,
  restoreBrainDumpItem,
  deleteBrainDumpItem,
  convertBrainDumpToTask,
  convertBrainDumpToNote,
  convertBrainDumpToProject,
  convertBrainDumpToGoal,
  convertBrainDumpByTarget,
  mapBrainDumpItemDto,
  type BrainDumpItemResponseDto,
} from "../api/brainDumpApi";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

const MOCK_DTO: BrainDumpItemResponseDto = {
  id: "bd-1",
  userId: "user-1",
  content: "Buy milk and read the book",
  status: "UNPROCESSED",
  archived: false,
  version: 0,
  createdAt: "2026-08-29T10:00:00Z",
  updatedAt: "2026-08-29T10:00:00Z",
};

describe("brainDumpApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("queryBrainDumpItems", () => {
    it("should fetch items with query parameters", async () => {
      mockApiRequest.mockResolvedValue({
        items: [MOCK_DTO],
        page: 0,
        size: 20,
        totalItems: 1,
        totalPages: 1,
      });

      const result = await queryBrainDumpItems({ q: "milk", status: "UNPROCESSED" });

      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items?q=milk&status=UNPROCESSED", {
        method: "GET",
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.content).toBe("Buy milk and read the book");
      expect(result.items[0]?.status).toBe("UNPROCESSED");
    });

    it("should fetch all items with no params", async () => {
      mockApiRequest.mockResolvedValue({
        items: [],
        page: 0,
        size: 20,
        totalItems: 0,
        totalPages: 0,
      });

      await queryBrainDumpItems();

      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items", { method: "GET" });
    });
  });

  describe("getBrainDumpItem", () => {
    it("should fetch a single item by id", async () => {
      mockApiRequest.mockResolvedValue(MOCK_DTO);

      const result = await getBrainDumpItem("bd-1");

      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1", { method: "GET" });
      expect(result.id).toBe("bd-1");
    });
  });

  describe("captureBrainDumpItem", () => {
    it("should POST to capture a new item", async () => {
      mockApiRequest.mockResolvedValue(MOCK_DTO);

      const result = await captureBrainDumpItem({ content: "Buy milk and read the book" });

      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items", {
        method: "POST",
        body: { content: "Buy milk and read the book" },
      });
      expect(result.content).toBe("Buy milk and read the book");
    });
  });

  describe("updateBrainDumpContent", () => {
    it("should PUT to update item content", async () => {
      mockApiRequest.mockResolvedValue({ ...MOCK_DTO, content: "Updated content", version: 1 });

      const result = await updateBrainDumpContent("bd-1", {
        content: "Updated content",
        version: 0,
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1", {
        method: "PUT",
        body: { content: "Updated content", version: 0 },
      });
      expect(result.version).toBe(1);
    });
  });

  describe("deferBrainDumpItem", () => {
    it("should POST to defer an item", async () => {
      mockApiRequest.mockResolvedValue({ ...MOCK_DTO, status: "DEFERRED" });

      const result = await deferBrainDumpItem("bd-1", 0);

      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1/defer", {
        method: "POST",
        body: { version: 0 },
      });
      expect(result.status).toBe("DEFERRED");
    });
  });

  describe("archiveBrainDumpItem", () => {
    it("should POST to archive an item", async () => {
      mockApiRequest.mockResolvedValue({ ...MOCK_DTO, archived: true });

      const result = await archiveBrainDumpItem("bd-1", 0);

      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1/archive", {
        method: "POST",
        body: { version: 0 },
      });
      expect(result.archived).toBe(true);
    });
  });

  describe("restoreBrainDumpItem", () => {
    it("should POST to restore an archived item", async () => {
      mockApiRequest.mockResolvedValue({ ...MOCK_DTO, archived: false });

      const result = await restoreBrainDumpItem("bd-1", 0);

      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1/restore", {
        method: "POST",
        body: { version: 0 },
      });
      expect(result.archived).toBe(false);
    });
  });

  describe("deleteBrainDumpItem", () => {
    it("should DELETE an item", async () => {
      mockApiRequest.mockResolvedValue(undefined);

      await deleteBrainDumpItem("bd-1");

      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1", { method: "DELETE" });
    });
  });

  describe("convert operations", () => {
    const CONVERTED_DTO: BrainDumpItemResponseDto = {
      ...MOCK_DTO,
      status: "CONVERTED",
      convertedToType: "TASK",
      convertedToId: "task-99",
      convertedAt: "2026-08-29T11:00:00Z",
    };

    it("should convert to Task with the full destination payload", async () => {
      mockApiRequest.mockResolvedValue(CONVERTED_DTO);
      const result = await convertBrainDumpToTask("bd-1", {
        title: "Buy milk",
        priority: "P3",
        version: 0,
      });
      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1/convert/task", {
        method: "POST",
        body: { title: "Buy milk", priority: "P3", version: 0 },
      });
      expect(result.status).toBe("CONVERTED");
      expect(result.convertedToType).toBe("TASK");
      expect(result.convertedToId).toBe("task-99");
    });

    it("should convert to Note with a body and version", async () => {
      mockApiRequest.mockResolvedValue({ ...CONVERTED_DTO, convertedToType: "NOTE" });
      await convertBrainDumpToNote("bd-1", { title: "Idea", body: "the body", version: 2 });
      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1/convert/note", {
        method: "POST",
        body: { title: "Idea", body: "the body", version: 2 },
      });
    });

    it("should convert to Project with a priority and version", async () => {
      mockApiRequest.mockResolvedValue({ ...CONVERTED_DTO, convertedToType: "PROJECT" });
      await convertBrainDumpToProject("bd-1", { name: "New Project", priority: "P2", version: 0 });
      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1/convert/project", {
        method: "POST",
        body: { name: "New Project", priority: "P2", version: 0 },
      });
    });

    it("should convert to Goal with category/progress/cadence", async () => {
      mockApiRequest.mockResolvedValue({ ...CONVERTED_DTO, convertedToType: "GOAL" });
      await convertBrainDumpToGoal("bd-1", {
        title: "Run a marathon",
        category: "HEALTH",
        progressType: "BINARY",
        checkInCadence: "WEEKLY",
        version: 0,
      });
      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1/convert/goal", {
        method: "POST",
        body: {
          title: "Run a marathon",
          category: "HEALTH",
          progressType: "BINARY",
          checkInCadence: "WEEKLY",
          version: 0,
        },
      });
    });

    it("convertBrainDumpByTarget dispatches to the matching endpoint", async () => {
      mockApiRequest.mockResolvedValue({ ...CONVERTED_DTO, convertedToType: "PROJECT" });
      await convertBrainDumpByTarget("bd-1", {
        target: "PROJECT",
        request: { name: "Dispatched", priority: "P3", version: 0 },
      });
      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1/convert/project", {
        method: "POST",
        body: { name: "Dispatched", priority: "P3", version: 0 },
      });
    });
  });

  describe("mapBrainDumpItemDto", () => {
    it("derives archived from archivedAt and maps conversion fields", () => {
      const { archived: _omitted, ...withoutArchived } = MOCK_DTO;
      void _omitted;
      const mapped = mapBrainDumpItemDto({
        ...withoutArchived,
        archivedAt: "2026-08-29T12:00:00Z",
        convertedToType: "GOAL",
        convertedToId: "goal-7",
        convertedAt: "2026-08-29T12:30:00Z",
      });
      expect(mapped.archived).toBe(true);
      expect(mapped.archivedAt).toBe("2026-08-29T12:00:00Z");
      expect(mapped.convertedToType).toBe("GOAL");
      expect(mapped.convertedToId).toBe("goal-7");
      expect(mapped.convertedAt).toBe("2026-08-29T12:30:00Z");
    });

    it("defaults conversion fields to null when absent", () => {
      const mapped = mapBrainDumpItemDto(MOCK_DTO);
      expect(mapped.archived).toBe(false);
      expect(mapped.convertedToType).toBeNull();
      expect(mapped.convertedToId).toBeNull();
      expect(mapped.convertedAt).toBeNull();
      expect(mapped.archivedAt).toBeNull();
    });
  });
});
