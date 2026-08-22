import { describe, expect, it } from "vitest";

import {
  detectBrowserTimezone,
  formatTimezonePreview,
  getAvailableTimezones,
  isValidTimezone,
} from "./timezones";

describe("timezones model", () => {
  it("detects browser timezone or falls back to UTC", () => {
    const tz = detectBrowserTimezone();
    expect(typeof tz).toBe("string");
    expect(isValidTimezone(tz)).toBe(true);
  });

  it("validates timezones correctly", () => {
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("America/New_York")).toBe(true);
    expect(isValidTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidTimezone("Europe/London")).toBe(true);
    expect(isValidTimezone("Invalid/Not_A_Real_Timezone")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
    expect(isValidTimezone(null as unknown as string)).toBe(false);
  });

  it("lists available timezones with UTC first", () => {
    const list = getAvailableTimezones();
    expect(list.length).toBeGreaterThan(10);
    expect(list[0]).toEqual({
      value: "UTC",
      label: "UTC (Coordinated Universal Time)",
    });
    const hasAsia = list.some((z) => z.value === "Asia/Kolkata");
    expect(hasAsia).toBe(true);
  });

  it("formats timezone preview accurately", () => {
    const fixedDate = new Date("2026-08-19T10:30:00.000Z");
    const preview = formatTimezonePreview("UTC", "en-US", fixedDate);

    expect(preview.todayDate).toBe("2026-08-19");
    expect(preview.currentTime).toBe("10:30");
    expect(preview.formattedToday).toContain("2026");
    expect(preview.sampleBlock).toBe("09:00 – 10:00");
  });

  it("falls back gracefully for invalid timezone in preview", () => {
    const preview = formatTimezonePreview("Invalid/Zone", "en-US");
    expect(preview.todayDate).toBeDefined();
    expect(preview.currentTime).toBeDefined();
  });
});
