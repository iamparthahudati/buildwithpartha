import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@lib/apiClient";

import { queryCalendarEvents, type CalendarResponse } from "../api/calendarApi";

vi.mock("@lib/apiClient", () => ({ apiRequest: vi.fn() }));

const mockApiRequest = vi.mocked(apiRequest);

describe("calendarApi", () => {
  beforeEach(() => vi.resetAllMocks());

  it("queries the inclusive local-date range with repeated source filters", async () => {
    const response: CalendarResponse = {
      startDate: "2026-10-26",
      endDate: "2026-12-06",
      timeZone: "America/New_York",
      sources: ["TIME_BLOCK", "TASK_DUE"],
      events: [],
      limit: 500,
      truncated: false,
    };
    mockApiRequest.mockResolvedValueOnce(response);

    await expect(
      queryCalendarEvents({
        startDate: "2026-10-26",
        endDate: "2026-12-06",
        timeZone: "America/New_York",
        sources: ["TIME_BLOCK", "TASK_DUE"],
        limit: 500,
      }),
    ).resolves.toBe(response);

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/calendar/events?startDate=2026-10-26&endDate=2026-12-06&timeZone=America%2FNew_York&source=TIME_BLOCK&source=TASK_DUE&limit=500",
      { method: "GET" },
    );
  });
});
