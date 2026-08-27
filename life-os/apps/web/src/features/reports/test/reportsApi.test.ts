import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchReportDefinitions,
  fetchReportDefinition,
  generateReportData,
} from "../api/reportsApi";
import * as apiClient from "@lib/apiClient";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

describe("reportsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls GET /reports/definitions for fetchReportDefinitions", async () => {
    const mockDefs = [{ reportType: "TASK_COMPLETION", name: "Task Report" }];
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce(mockDefs);

    const result = await fetchReportDefinitions();

    expect(apiClient.apiRequest).toHaveBeenCalledWith("/reports/definitions", {});
    expect(result).toEqual(mockDefs);
  });

  it("calls GET /reports/definitions/{type} for fetchReportDefinition", async () => {
    const mockDef = { reportType: "TIME_ALLOCATION", name: "Time Report" };
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce(mockDef);

    const result = await fetchReportDefinition("TIME_ALLOCATION");

    expect(apiClient.apiRequest).toHaveBeenCalledWith("/reports/definitions/TIME_ALLOCATION", {});
    expect(result).toEqual(mockDef);
  });

  it("calls GET /reports/generate with formatted query parameters", async () => {
    const mockResponse = { reportType: "TASK_COMPLETION", metrics: [] };
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce(mockResponse);

    const result = await generateReportData({
      reportType: "TASK_COMPLETION",
      periodPreset: "THIS_MONTH",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      timeZone: "Asia/Kolkata",
      projectId: "p-123",
      category: "Engineering",
    });

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      "/reports/generate?reportType=TASK_COMPLETION&startDate=2026-08-01&endDate=2026-08-31&timeZone=Asia%2FKolkata&projectId=p-123&category=Engineering",
      {},
    );
    expect(result).toEqual(mockResponse);
  });
});
