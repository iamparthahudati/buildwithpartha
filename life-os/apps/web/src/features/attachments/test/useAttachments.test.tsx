import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as attachmentsApi from "../api/attachmentsApi";
import { useAttachmentMutations } from "../hooks/useAttachmentMutations";
import { useAttachments } from "../hooks/useAttachments";

vi.mock("../api/attachmentsApi");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAttachments and useAttachmentMutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useAttachments fetches entity attachments and returns enabled status", async () => {
    vi.mocked(attachmentsApi.listAttachments).mockResolvedValueOnce({
      enabled: true,
      attachments: [
        {
          id: "att-1",
          fileName: "spec.pdf",
          fileSizeBytes: 2048,
          status: "ready",
        },
      ],
    });

    const { result } = renderHook(() => useAttachments("TASK", "task-100"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.enabled).toBe(true);
    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0]!.fileName).toBe("spec.pdf");
  });

  it("useAttachmentMutations performs upload, delete, and download", async () => {
    vi.mocked(attachmentsApi.uploadAttachment).mockResolvedValueOnce({
      id: "att-2",
      fileName: "image.png",
      fileSizeBytes: 1024,
      status: "ready",
    });
    vi.mocked(attachmentsApi.deleteAttachment).mockResolvedValueOnce(undefined);
    vi.mocked(attachmentsApi.downloadAttachment).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAttachmentMutations("TASK", "task-100"), {
      wrapper: createWrapper(),
    });

    const testFile = new File(["data"], "image.png", { type: "image/png" });
    await result.current.uploadFiles([testFile]);

    expect(attachmentsApi.uploadAttachment).toHaveBeenCalledWith("TASK", "task-100", testFile);

    await result.current.downloadFile("att-2", "image.png");
    expect(attachmentsApi.downloadAttachment).toHaveBeenCalledWith("att-2", "image.png");

    await result.current.deleteFile("att-2");
    expect(attachmentsApi.deleteAttachment).toHaveBeenCalledWith("att-2");
  });
});
