import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProgressReport, invalidateProgressQueries } from "./useProgress";
import * as progressApi from "../api/progressApi";

vi.mock("../api/progressApi", () => ({
  fetchProgressReport: vi.fn(),
}));

const mockFetchProgressReport = vi.mocked(progressApi.fetchProgressReport);

describe("useProgress", () => {
  it("fetches progress report using useProgressReport", async () => {
    const mockReport = {
      metricDictionaryVersion: "1.0.0",
      generatedAt: "2026-08-27T00:00:00Z",
      timeZone: "UTC",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      taskProgress: {
        totalCount: 0,
        completedCount: 0,
        dueCount: 0,
        overdueCount: 0,
        highPriorityCount: 0,
        blockedCount: 0,
        completionRatePercentage: null,
      },
      focusProgress: {
        plannedFocusMinutes: 0,
        actualFocusMinutes: 0,
        actualBreakMinutes: 0,
        comparisonMinutes: null,
        comparisonSource: "NONE" as const,
        plannedVsActualRatio: null,
        categoryBreakdown: [],
      },
      projectProgress: { totalCount: 0, statusCounts: {}, averageProgressPercentage: null },
      goalProgress: {
        totalCount: 0,
        averageProgressPercentage: null,
        goalsWithRecentCheckinCount: 0,
      },
      habitProgress: { totalCount: 0, completionRatePercentage: null },
      reviewProgress: { dailyStreakDays: 0, finalizedReviewsCount: 0 },
      summaryText: "No data",
    };

    mockFetchProgressReport.mockResolvedValueOnce(mockReport);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const filterParams = {
      periodPreset: "THIS_MONTH" as const,
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      timeZone: "UTC",
    };
    const { result } = renderHook(() => useProgressReport(filterParams), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockReport);
  });

  it("invalidates progress queries", async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    await invalidateProgressQueries(queryClient);
    expect(spy).toHaveBeenCalledWith({ queryKey: ["progress"] });
  });
});
