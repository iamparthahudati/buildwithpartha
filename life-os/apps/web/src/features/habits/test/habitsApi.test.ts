import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@lib/apiClient";

import {
  getHabitStatistics,
  listHabitEntries,
  mapHabitStatistics,
  removeHabitEntry,
  setHabitEntry,
  type HabitStatsResponseDto,
} from "../api/habitsApi";

vi.mock("@lib/apiClient", () => ({ apiRequest: vi.fn() }));

const mockApiRequest = vi.mocked(apiRequest);

const STATS_DTO: HabitStatsResponseDto = {
  habitId: "habit-1",
  from: "2026-08-01",
  to: "2026-08-30",
  totalDays: 30,
  daysWithEntry: 18,
  daysMeetingTarget: 16,
  totalCompletions: 24,
  completionRate: 16 / 30,
  currentStreak: 4,
  longestStreak: 9,
  eligiblePeriods: 26,
  metTargetPeriods: 16,
  cadenceCompletionRate: 16 / 26,
};

describe("habitsApi", () => {
  beforeEach(() => vi.resetAllMocks());

  it("maps the server's authoritative cadence statistics separately from raw day counts", () => {
    const result = mapHabitStatistics(STATS_DTO);

    expect(result.currentStreak).toBe(4);
    expect(result.eligiblePeriods).toBe(26);
    expect(result.completionRate).toBe(16 / 26);
    expect(result.dayCompletionRate).toBe(16 / 30);
  });

  it("keeps entry range dates as URL-local date strings", async () => {
    mockApiRequest.mockResolvedValueOnce([]);

    await listHabitEntries("habit-1", "2026-08-01", "2026-08-30");

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/habits/habit-1/entries?from=2026-08-01&to=2026-08-30",
      { method: "GET" },
    );
  });

  it("uses absolute set and idempotent remove entry contracts", async () => {
    mockApiRequest.mockResolvedValueOnce({
      id: "entry-1",
      habitId: "habit-1",
      userId: "user-1",
      localDate: "2026-08-30",
      completedCount: 3,
      createdAt: "2026-08-30T00:00:00Z",
      updatedAt: "2026-08-30T00:00:00Z",
      version: 1,
    });
    await setHabitEntry("habit-1", "2026-08-30", 3);
    await removeHabitEntry("habit-1", "2026-08-30");

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/habits/habit-1/entries", {
      method: "PUT",
      body: { date: "2026-08-30", count: 3 },
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/habits/habit-1/entries?date=2026-08-30", {
      method: "DELETE",
    });
  });

  it("requests the bounded statistics window", async () => {
    mockApiRequest.mockResolvedValueOnce(STATS_DTO);
    const result = await getHabitStatistics("habit-1", "2026-08-01", "2026-08-30");

    expect(result.longestStreak).toBe(9);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/habits/habit-1/stats?from=2026-08-01&to=2026-08-30",
      { method: "GET" },
    );
  });
});
