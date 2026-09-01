import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as recurringSeriesApi from "../api/recurringSeriesApi";
import {
  recurringSeriesQueryKeys,
  useCreateRecurringSeries,
  useDeleteRecurringSeries,
  useRecurringSeries,
  useRecurringSeriesList,
  useSkipOccurrence,
  useUpdateRecurringSeries,
} from "../hooks/useRecurringSeries";

vi.mock("../api/recurringSeriesApi", () => ({
  createRecurringSeries: vi.fn(),
  deleteRecurringSeries: vi.fn(),
  getRecurringSeries: vi.fn(),
  listRecurringSeries: vi.fn(),
  listRecurringSeriesExceptions: vi.fn(),
  skipOccurrence: vi.fn(),
  updateRecurringSeries: vi.fn(),
}));

const mockCreateSeries = vi.mocked(recurringSeriesApi.createRecurringSeries);
const mockListSeries = vi.mocked(recurringSeriesApi.listRecurringSeries);
const mockGetSeries = vi.mocked(recurringSeriesApi.getRecurringSeries);
const mockUpdateSeries = vi.mocked(recurringSeriesApi.updateRecurringSeries);
const mockDeleteSeries = vi.mocked(recurringSeriesApi.deleteRecurringSeries);
const mockSkipOccurrence = vi.mocked(recurringSeriesApi.skipOccurrence);

const MOCK_SERIES: recurringSeriesApi.RecurringSeriesResponseDto = {
  id: "series-123",
  userId: "user-1",
  title: "Weekly Review",
  description: "Weekly planning",
  priority: "P2",
  projectId: null,
  estimateMinutes: 60,
  frequency: "WEEKLY",
  intervalValue: 1,
  daysOfWeek: ["MONDAY"],
  dayOfMonth: null,
  endMode: "NEVER",
  endDate: null,
  endCount: null,
  startDate: "2026-09-01",
  timeZone: "UTC",
  active: true,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
}

describe("useRecurringSeries hooks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("builds query keys correctly", () => {
    expect(recurringSeriesQueryKeys.all).toEqual(["recurring-series"]);
    expect(recurringSeriesQueryKeys.list()).toEqual(["recurring-series", "list"]);
    expect(recurringSeriesQueryKeys.detail("s1")).toEqual(["recurring-series", "detail", "s1"]);
  });

  it("fetches recurring series list when enabled", async () => {
    mockListSeries.mockResolvedValueOnce([MOCK_SERIES]);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRecurringSeriesList(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_SERIES]);
    expect(mockListSeries).toHaveBeenCalledTimes(1);
  });

  it("does not fetch recurring series list when disabled", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRecurringSeriesList(false), { wrapper: Wrapper });
    expect(result.current.isFetching).toBe(false);
    expect(mockListSeries).not.toHaveBeenCalled();
  });

  it("fetches single recurring series detail by id", async () => {
    mockGetSeries.mockResolvedValueOnce(MOCK_SERIES);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRecurringSeries("series-123"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("Weekly Review");
    expect(mockGetSeries).toHaveBeenCalledWith("series-123");
  });

  it("does not fetch detail when id is null or enabled is false", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRecurringSeries(null, false), { wrapper: Wrapper });
    expect(result.current.isFetching).toBe(false);
    expect(mockGetSeries).not.toHaveBeenCalled();
  });

  it("executes create recurring series mutation and invalidates queries", async () => {
    mockCreateSeries.mockResolvedValueOnce(MOCK_SERIES);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateRecurringSeries(), { wrapper: Wrapper });

    await result.current.mutateAsync({
      title: "Weekly Review",
      frequency: "WEEKLY",
      endMode: "NEVER",
      startDate: "2026-09-01",
      timeZone: "UTC",
    });

    expect(mockCreateSeries).toHaveBeenCalledWith({
      title: "Weekly Review",
      frequency: "WEEKLY",
      endMode: "NEVER",
      startDate: "2026-09-01",
      timeZone: "UTC",
    });
  });

  it("executes update recurring series mutation", async () => {
    mockUpdateSeries.mockResolvedValueOnce({ ...MOCK_SERIES, title: "Updated Review" });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateRecurringSeries(), { wrapper: Wrapper });

    await result.current.mutateAsync({
      id: "series-123",
      request: {
        title: "Updated Review",
        frequency: "WEEKLY",
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
        scope: "SERIES",
      },
    });

    expect(mockUpdateSeries).toHaveBeenCalledWith("series-123", {
      title: "Updated Review",
      frequency: "WEEKLY",
      endMode: "NEVER",
      startDate: "2026-09-01",
      timeZone: "UTC",
      scope: "SERIES",
    });
  });

  it("executes delete recurring series mutation", async () => {
    mockDeleteSeries.mockResolvedValueOnce(undefined);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteRecurringSeries(), { wrapper: Wrapper });

    await result.current.mutateAsync("series-123");
    expect(mockDeleteSeries).toHaveBeenCalledWith("series-123");
  });

  it("executes skip occurrence mutation", async () => {
    mockSkipOccurrence.mockResolvedValueOnce(undefined);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSkipOccurrence(), { wrapper: Wrapper });

    await result.current.mutateAsync({
      seriesId: "series-123",
      request: { occurrenceDate: "2026-09-08", reason: "Vacation" },
    });

    expect(mockSkipOccurrence).toHaveBeenCalledWith("series-123", {
      occurrenceDate: "2026-09-08",
      reason: "Vacation",
    });
  });
});
