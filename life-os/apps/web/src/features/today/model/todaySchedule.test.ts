import { describe, expect, it } from "vitest";

import { formatTodayScheduleTime } from "./todaySchedule";

describe("formatTodayScheduleTime", () => {
  it("formats a local wall-clock time without applying the browser timezone", () => {
    expect(formatTodayScheduleTime("09:30", "en-US")).toBe("9:30 AM");
    expect(formatTodayScheduleTime("21:05", "en-GB")).toBe("21:05");
  });

  it("accepts the API's optional seconds without displaying them", () => {
    expect(formatTodayScheduleTime("14:45:30", "en-US")).toBe("2:45 PM");
  });
});
