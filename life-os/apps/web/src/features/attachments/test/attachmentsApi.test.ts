import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiBlobRequest, apiRequest } from "@lib/apiClient";
import {
  deleteAttachment,
  downloadAttachment,
  getAttachment,
  listAttachments,
  uploadAttachment,
} from "../api/attachmentsApi";
import type { AttachmentListResponse, AttachmentResponse } from "../model/attachment";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
  apiBlobRequest: vi.fn(),
}));

const SAMPLE_RESPONSE: AttachmentResponse = {
  id: "att-101",
  entityType: "TASK",
  entityId: "task-202",
  fileName: "document.pdf",
  sanitizedFileName: "document.pdf",
  contentType: "application/pdf",
  fileSizeBytes: 1024,
  status: "CLEAN",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

describe("attachmentsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listAttachments", () => {
    it("returns enabled true and mapped attachments list on success", async () => {
      const listRes: AttachmentListResponse = {
        items: [
          SAMPLE_RESPONSE,
          { ...SAMPLE_RESPONSE, id: "att-102", status: "PENDING_SCAN" },
          { ...SAMPLE_RESPONSE, id: "att-103", status: "QUARANTINED" },
        ],
      };
      vi.mocked(apiRequest).mockResolvedValueOnce(listRes);

      const result = await listAttachments("TASK", "task-202");

      expect(apiRequest).toHaveBeenCalledWith("/attachments?entityType=TASK&entityId=task-202", {
        signal: undefined,
        suppressAuthenticationRecovery: false,
      });
      expect(result.enabled).toBe(true);
      expect(result.attachments).toHaveLength(3);
      expect(result.attachments[0]!.status).toBe("ready");
      expect(result.attachments[1]!.status).toBe("scanning");
      expect(result.attachments[2]!.status).toBe("blocked");
    });

    it("returns enabled false when backend responds with 404 (feature toggle disabled)", async () => {
      vi.mocked(apiRequest).mockRejectedValueOnce({ status: 404, message: "Disabled" });

      const result = await listAttachments("TASK", "task-202");

      expect(result.enabled).toBe(false);
      expect(result.attachments).toEqual([]);
    });

    it("rethrows non-404 errors", async () => {
      vi.mocked(apiRequest).mockRejectedValueOnce(new Error("Server error"));

      await expect(listAttachments("TASK", "task-202")).rejects.toThrow("Server error");
    });
  });

  describe("getAttachment", () => {
    it("fetches single attachment by id", async () => {
      vi.mocked(apiRequest).mockResolvedValueOnce(SAMPLE_RESPONSE);

      const result = await getAttachment("att-101");

      expect(apiRequest).toHaveBeenCalledWith("/attachments/att-101", { signal: undefined });
      expect(result.id).toBe("att-101");
      expect(result.fileName).toBe("document.pdf");
      expect(result.status).toBe("ready");
    });
  });

  describe("uploadAttachment", () => {
    it("posts file as multipart FormData to /attachments", async () => {
      vi.mocked(apiRequest).mockResolvedValueOnce(SAMPLE_RESPONSE);
      const file = new File(["dummy content"], "test.pdf", { type: "application/pdf" });

      const result = await uploadAttachment("TASK", "task-202", file);

      expect(apiRequest).toHaveBeenCalledWith(
        "/attachments",
        expect.objectContaining({
          method: "POST",
        }),
      );
      expect(result.id).toBe("att-101");
    });
  });

  describe("downloadAttachment", () => {
    it("requests blob and triggers browser download anchor", async () => {
      const blob = new Blob(["test binary"], { type: "application/pdf" });
      vi.mocked(apiBlobRequest).mockResolvedValueOnce(blob);

      const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/test");
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      await downloadAttachment("att-101", "document.pdf");

      expect(apiBlobRequest).toHaveBeenCalledWith("/attachments/att-101/download");
      expect(createObjectURLMock).toHaveBeenCalledWith(blob);
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/test");
    });
  });

  describe("deleteAttachment", () => {
    it("issues DELETE request to /attachments/{id}", async () => {
      vi.mocked(apiRequest).mockResolvedValueOnce(undefined);

      await deleteAttachment("att-101");

      expect(apiRequest).toHaveBeenCalledWith("/attachments/att-101", { method: "DELETE" });
    });
  });
});
