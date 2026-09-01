import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiRequest } from "@lib/apiClient";
import {
  createRecurringSeries,
  deleteRecurringSeries,
  getRecurringSeries,
  listRecurringSeries,
  listRecurringSeriesExceptions,
  skipOccurrence,
  updateRecurringSeries,
  type CreateRecurringSeriesRequestDto,
  type UpdateRecurringSeriesRequestDto,
} from "../api/recurringSeriesApi";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

describe("recurringSeriesApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls POST /tasks/recurring-series when creating a series", async () => {
    const mockResponse = {
      id: "series-123",
      userId: "user-1",
      title: "Daily Standup",
      frequency: "DAILY",
      intervalValue: 1,
      endMode: "NEVER",
      startDate: "2026-09-01",
      timeZone: "UTC",
      active: true,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
    };
    vi.mocked(apiRequest).mockResolvedValue(mockResponse);

    const request: CreateRecurringSeriesRequestDto = {
      title: "Daily Standup",
      frequency: "DAILY",
      endMode: "NEVER",
      startDate: "2026-09-01",
      timeZone: "UTC",
    };

    const result = await createRecurringSeries(request);
    expect(apiRequest).toHaveBeenCalledWith("/tasks/recurring-series", {
      method: "POST",
      body: request,
    });
    expect(result).toEqual(mockResponse);
  });

  it("calls GET /tasks/recurring-series when listing series", async () => {
    vi.mocked(apiRequest).mockResolvedValue([]);
    const result = await listRecurringSeries();
    expect(apiRequest).toHaveBeenCalledWith("/tasks/recurring-series", {
      method: "GET",
    });
    expect(result).toEqual([]);
  });

  it("calls GET /tasks/recurring-series/{id} when getting a series", async () => {
    const mockResponse = { id: "series-1" };
    vi.mocked(apiRequest).mockResolvedValue(mockResponse);

    const result = await getRecurringSeries("series-1");
    expect(apiRequest).toHaveBeenCalledWith("/tasks/recurring-series/series-1", {
      method: "GET",
    });
    expect(result).toEqual(mockResponse);
  });

  it("calls PUT /tasks/recurring-series/{id} when updating a series", async () => {
    const mockResponse = { id: "series-1", title: "Updated" };
    vi.mocked(apiRequest).mockResolvedValue(mockResponse);

    const request: UpdateRecurringSeriesRequestDto = {
      title: "Updated",
      frequency: "WEEKLY",
      endMode: "NEVER",
      startDate: "2026-09-01",
      timeZone: "UTC",
      scope: "SERIES",
    };

    const result = await updateRecurringSeries("series-1", request);
    expect(apiRequest).toHaveBeenCalledWith("/tasks/recurring-series/series-1", {
      method: "PUT",
      body: request,
    });
    expect(result).toEqual(mockResponse);
  });

  it("calls DELETE /tasks/recurring-series/{id} when deleting a series", async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);
    await deleteRecurringSeries("series-1");
    expect(apiRequest).toHaveBeenCalledWith("/tasks/recurring-series/series-1", {
      method: "DELETE",
    });
  });

  it("calls POST /tasks/recurring-series/{id}/skip when skipping an occurrence", async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);
    await skipOccurrence("series-1", { occurrenceDate: "2026-09-02", reason: "Vacation" });
    expect(apiRequest).toHaveBeenCalledWith("/tasks/recurring-series/series-1/skip", {
      method: "POST",
      body: { occurrenceDate: "2026-09-02", reason: "Vacation" },
    });
  });

  it("calls GET /tasks/recurring-series/{id}/exceptions when fetching exceptions", async () => {
    vi.mocked(apiRequest).mockResolvedValue([]);
    const result = await listRecurringSeriesExceptions("series-1");
    expect(apiRequest).toHaveBeenCalledWith("/tasks/recurring-series/series-1/exceptions", {
      method: "GET",
    });
    expect(result).toEqual([]);
  });
});
