import { describe, expect, it } from "vitest";

import { computeFormatsPreview, getWeekStartName } from "./formatsPreview";

describe("formatsPreview", () => {
  const FIXED_DATE = new Date("2026-08-19T10:30:00.000Z");

  it("returns week start names correctly", () => {
    expect(getWeekStartName(1)).toBe("Monday");
    expect(getWeekStartName(2)).toBe("Tuesday");
    expect(getWeekStartName(7)).toBe("Sunday");
    expect(getWeekStartName(0)).toBe("Monday");
    expect(getWeekStartName(9)).toBe("Monday");
  });

  it("computes preview for Asia/Kolkata and en-IN", () => {
    const preview = computeFormatsPreview("Asia/Kolkata", "en-IN", 1, FIXED_DATE);

    expect(preview.todayDate).toContain("2026");
    expect(preview.currentTime).toBeDefined();
    expect(preview.shortDate).toBeDefined();
    expect(preview.relativeExample).toContain("Today");
    expect(preview.numberExample).toBe("1,234.50");
    expect(preview.weekStartName).toBe("Monday");
  });

  it("computes preview for America/New_York and en-US with Sunday week start", () => {
    const preview = computeFormatsPreview("America/New_York", "en-US", 7, FIXED_DATE);

    expect(preview.todayDate).toContain("2026");
    expect(preview.currentTime).toBeDefined();
    expect(preview.numberExample).toBe("1,234.50");
    expect(preview.weekStartName).toBe("Sunday");
  });

  it("handles invalid timezone or locale gracefully with safe fallbacks", () => {
    const preview = computeFormatsPreview("Invalid/Zone", "invalid-loc", 1, FIXED_DATE);

    expect(preview.todayDate).toBeDefined();
    expect(preview.currentTime).toBeDefined();
    expect(preview.shortDate).toBeDefined();
    expect(preview.weekStartName).toBe("Monday");
  });
});
