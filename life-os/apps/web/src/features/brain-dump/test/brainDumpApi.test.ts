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
    it("should convert to Task", async () => {
      mockApiRequest.mockResolvedValue({ ...MOCK_DTO, status: "CONVERTED" });
      const result = await convertBrainDumpToTask("bd-1", { title: "Buy milk" });
      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1/convert/task", {
        method: "POST",
        body: { title: "Buy milk" },
      });
      expect(result.status).toBe("CONVERTED");
    });

    it("should convert to Note", async () => {
      mockApiRequest.mockResolvedValue({ ...MOCK_DTO, status: "CONVERTED" });
      await convertBrainDumpToNote("bd-1");
      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1/convert/note", {
        method: "POST",
        body: {},
      });
    });

    it("should convert to Project", async () => {
      mockApiRequest.mockResolvedValue({ ...MOCK_DTO, status: "CONVERTED" });
      await convertBrainDumpToProject("bd-1", { name: "New Project" });
      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1/convert/project", {
        method: "POST",
        body: { name: "New Project" },
      });
    });

    it("should convert to Goal", async () => {
      mockApiRequest.mockResolvedValue({ ...MOCK_DTO, status: "CONVERTED" });
      await convertBrainDumpToGoal("bd-1");
      expect(mockApiRequest).toHaveBeenCalledWith("/brain-dump-items/bd-1/convert/goal", {
        method: "POST",
        body: {},
      });
    });
  });
});
