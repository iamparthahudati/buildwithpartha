import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestCsvExport, buildCsvDownloadUrl } from "../api/csvExportApi";
import * as apiClient from "@lib/apiClient";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@app/environment", () => ({
  readPublicEnvironment: () => ({ apiBasePath: "/life-os/api/v1", appBasePath: "/life-os/" }),
}));

describe("csvExportApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts to /reports/export/csv with all parameters", async () => {
    const mockResponse = {
      exportId: "export-123",
      fileName: "lifeos-task-completion-2026-08-01-to-2026-08-27.csv",
      downloadToken: "abc123token",
      tokenTtlMinutes: 15,
      reportType: "TASK_COMPLETION",
      startDate: "2026-08-01",
      endDate: "2026-08-27",
      timeZone: "UTC",
    };
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce(mockResponse);

    const result = await requestCsvExport({
      reportType: "TASK_COMPLETION",
      startDate: "2026-08-01",
      endDate: "2026-08-27",
      timeZone: "UTC",
      projectId: "proj-1",
      category: "Engineering",
    });

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      "/reports/export/csv?reportType=TASK_COMPLETION&startDate=2026-08-01&endDate=2026-08-27&timeZone=UTC&projectId=proj-1&category=Engineering",
      { method: "POST" },
    );
    expect(result).toEqual(mockResponse);
  });

  it("posts without optional parameters when absent", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({});

    await requestCsvExport({
      reportType: "TIME_ALLOCATION",
      timeZone: "Asia/Kolkata",
    });

    const calls = vi.mocked(apiClient.apiRequest).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const calledPath = (calls[0]?.[0] ?? "") as string;
    expect(calledPath).toContain("reportType=TIME_ALLOCATION");
    expect(calledPath).toContain("timeZone=Asia%2FKolkata");
    expect(calledPath).not.toContain("startDate");
    expect(calledPath).not.toContain("projectId");
  });

  it("buildCsvDownloadUrl constructs URL with encoded token", () => {
    const url = buildCsvDownloadUrl("mytoken+special");
    expect(url).toContain("/reports/export/csv/download?token=");
    expect(url).toContain(encodeURIComponent("mytoken+special"));
  });
});
