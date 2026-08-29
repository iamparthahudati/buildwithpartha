import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest } from "@lib/apiClient";
import {
  queryNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  pinNote,
  unpinNote,
  archiveNote,
  restoreNote,
  type NoteResponseDto,
} from "../api/notesApi";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

const MOCK_NOTE_DTO: NoteResponseDto = {
  id: "note-123",
  userId: "user-456",
  title: "A simple note",
  body: "This is the body of the note.",
  pinned: false,
  archived: false,
  createdAt: "2026-08-20T10:00:00Z",
  updatedAt: "2026-08-20T12:00:00Z",
  labelIds: ["label-1"],
  links: [
    {
      id: "link-1",
      noteId: "note-123",
      userId: "user-456",
      targetType: "PROJECT",
      targetId: "proj-1",
      createdAt: "2026-08-20T12:00:00Z",
    },
  ],
  version: 1,
};

describe("notesApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("queryNotes", () => {
    it("should fetch notes with query parameters", async () => {
      mockApiRequest.mockResolvedValue({
        items: [MOCK_NOTE_DTO],
        page: 0,
        size: 20,
        totalItems: 1,
        totalPages: 1,
      });

      const result = await queryNotes({ q: "simple", pinned: false, labelId: ["label-1"] });

      expect(mockApiRequest).toHaveBeenCalledWith("/notes?q=simple&pinned=false&labelId=label-1", {
        method: "GET",
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.title).toBe("A simple note");
      expect(result.items[0]?.links[0]?.targetType).toBe("PROJECT");
    });
  });

  describe("getNote", () => {
    it("should fetch a single note by id", async () => {
      mockApiRequest.mockResolvedValue(MOCK_NOTE_DTO);

      const result = await getNote("note-123");

      expect(mockApiRequest).toHaveBeenCalledWith("/notes/note-123", { method: "GET" });
      expect(result.id).toBe("note-123");
    });
  });

  describe("createNote", () => {
    it("should issue a POST request to create a note", async () => {
      mockApiRequest.mockResolvedValue(MOCK_NOTE_DTO);

      const request = {
        title: "New Note",
        body: "New Body",
        labelIds: ["label-1"],
        links: [{ targetType: "PROJECT" as const, targetId: "proj-1" }],
      };

      const result = await createNote(request);

      expect(mockApiRequest).toHaveBeenCalledWith("/notes", {
        method: "POST",
        body: request,
      });
      expect(result.title).toBe("A simple note");
    });
  });

  describe("updateNote", () => {
    it("should issue a PUT request to update a note", async () => {
      mockApiRequest.mockResolvedValue(MOCK_NOTE_DTO);

      const request = {
        title: "Updated Note",
        body: "Updated Body",
        labelIds: ["label-1"],
        links: [],
        version: 1,
      };

      const result = await updateNote("note-123", request);

      expect(mockApiRequest).toHaveBeenCalledWith("/notes/note-123", {
        method: "PUT",
        body: request,
      });
      expect(result.version).toBe(1);
    });
  });

  describe("deleteNote", () => {
    it("should issue a DELETE request to delete a note", async () => {
      mockApiRequest.mockResolvedValue(undefined);

      await deleteNote("note-123");

      expect(mockApiRequest).toHaveBeenCalledWith("/notes/note-123", { method: "DELETE" });
    });
  });

  describe("pinNote", () => {
    it("should issue a POST request to pin a note", async () => {
      mockApiRequest.mockResolvedValue({ ...MOCK_NOTE_DTO, pinned: true });

      const result = await pinNote("note-123", 1);

      expect(mockApiRequest).toHaveBeenCalledWith("/notes/note-123/pin", {
        method: "POST",
        body: { version: 1 },
      });
      expect(result.pinned).toBe(true);
    });
  });

  describe("unpinNote", () => {
    it("should issue a POST request to unpin a note", async () => {
      mockApiRequest.mockResolvedValue({ ...MOCK_NOTE_DTO, pinned: false });

      const result = await unpinNote("note-123", 1);

      expect(mockApiRequest).toHaveBeenCalledWith("/notes/note-123/unpin", {
        method: "POST",
        body: { version: 1 },
      });
      expect(result.pinned).toBe(false);
    });
  });

  describe("archiveNote", () => {
    it("should issue a POST request to archive a note", async () => {
      mockApiRequest.mockResolvedValue({ ...MOCK_NOTE_DTO, archived: true });

      const result = await archiveNote("note-123", 1);

      expect(mockApiRequest).toHaveBeenCalledWith("/notes/note-123/archive", {
        method: "POST",
        body: { version: 1 },
      });
      expect(result.archived).toBe(true);
    });
  });

  describe("restoreNote", () => {
    it("should issue a POST request to restore a note", async () => {
      mockApiRequest.mockResolvedValue({ ...MOCK_NOTE_DTO, archived: false });

      const result = await restoreNote("note-123", 1);

      expect(mockApiRequest).toHaveBeenCalledWith("/notes/note-123/restore", {
        method: "POST",
        body: { version: 1 },
      });
      expect(result.archived).toBe(false);
    });
  });
});
