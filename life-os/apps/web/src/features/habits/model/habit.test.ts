import { describe, expect, it } from "vitest";

import {
  clampHabitRate,
  formatHabitCadence,
  formatHabitRate,
  formatHabitReminderTime,
  formatHabitTarget,
  habitHeatmapLevel,
} from "./habit";

describe("Habit presentation model", () => {
  it("formats cadence, target, reminder, and bounded rates", () => {
    expect(formatHabitCadence("WEEKLY")).toBe("Weekly");
    expect(formatHabitTarget({ cadence: "DAILY", targetCount: 1 })).toBe("1 time per day");
    expect(formatHabitTarget({ cadence: "MONTHLY", targetCount: 4 })).toBe("4 times per month");
    expect(formatHabitReminderTime("13:30", "en-US")).toBe("1:30 PM");
    expect(clampHabitRate(Number.NaN)).toBe(0);
    expect(formatHabitRate(1.4, "en-US")).toBe("100%");
  });

  it("maps completion ratios and pauses to deterministic heatmap levels", () => {
    expect(habitHeatmapLevel({ localDate: "2026-08-01", completedCount: 0, targetCount: 4 })).toBe(
      0,
    );
    expect(habitHeatmapLevel({ localDate: "2026-08-02", completedCount: 1, targetCount: 4 })).toBe(
      1,
    );
    expect(habitHeatmapLevel({ localDate: "2026-08-03", completedCount: 2, targetCount: 4 })).toBe(
      2,
    );
    expect(habitHeatmapLevel({ localDate: "2026-08-04", completedCount: 3, targetCount: 4 })).toBe(
      3,
    );
    expect(habitHeatmapLevel({ localDate: "2026-08-05", completedCount: 4, targetCount: 4 })).toBe(
      4,
    );
    expect(
      habitHeatmapLevel({
        localDate: "2026-08-06",
        completedCount: 4,
        targetCount: 4,
        paused: true,
      }),
    ).toBe(0);
  });
});
