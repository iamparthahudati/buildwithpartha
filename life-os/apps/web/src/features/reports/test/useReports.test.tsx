import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReportDefinitions, useReportData } from "../hooks/useReports";
import * as reportsApi from "../api/reportsApi";

vi.mock("../api/reportsApi", () => ({
  fetchReportDefinitions: vi.fn(),
  generateReportData: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useReports hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useReportDefinitions", () => {
    it("fetches and returns report definitions", async () => {
      const mockDefs = [{ reportType: "TASK_COMPLETION", name: "Task Report" }];
      vi.mocked(reportsApi.fetchReportDefinitions).mockResolvedValueOnce(mockDefs as any);

      const { result } = renderHook(() => useReportDefinitions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockDefs);
    });
  });

  describe("useReportData", () => {
    it("generates report data for given filters", async () => {
      const mockData = { reportType: "TASK_COMPLETION", metrics: [] };
      vi.mocked(reportsApi.generateReportData).mockResolvedValueOnce(mockData as any);

      const filters = {
        reportType: "TASK_COMPLETION" as const,
        periodPreset: "THIS_MONTH" as const,
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        timeZone: "Asia/Kolkata",
      };

      const { result } = renderHook(() => useReportData(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
    });
  });
});
