import { describe, it, expect } from "vitest";
import { getPeriodPresetDates, sanitizeNonCausalCopy } from "./progress";

describe("progress model helpers", () => {
  const refDate = new Date("2026-08-27T12:00:00Z");

  it("computes preset dates for TODAY", () => {
    const dates = getPeriodPresetDates("TODAY", refDate);
    expect(dates.startDate).toBe("2026-08-27");
    expect(dates.endDate).toBe("2026-08-27");
  });

  it("computes preset dates for THIS_WEEK", () => {
    const dates = getPeriodPresetDates("THIS_WEEK", refDate);
    expect(dates.startDate).toBe("2026-08-24");
    expect(dates.endDate).toBe("2026-08-30");
  });

  it("computes preset dates for THIS_MONTH", () => {
    const dates = getPeriodPresetDates("THIS_MONTH", refDate);
    expect(dates.startDate).toBe("2026-08-01");
    expect(dates.endDate).toBe("2026-08-31");
  });

  it("computes preset dates for THIS_QUARTER", () => {
    const dates = getPeriodPresetDates("THIS_QUARTER", refDate);
    expect(dates.startDate).toBe("2026-07-01");
    expect(dates.endDate).toBe("2026-09-30");
  });

  it("computes preset dates for THIS_YEAR", () => {
    const dates = getPeriodPresetDates("THIS_YEAR", refDate);
    expect(dates.startDate).toBe("2026-01-01");
    expect(dates.endDate).toBe("2026-12-31");
  });

  it("computes preset dates for CUSTOM fallback", () => {
    const dates = getPeriodPresetDates("CUSTOM", refDate);
    expect(dates.startDate).toBe("2026-08-01");
    expect(dates.endDate).toBe("2026-08-31");
  });

  it("sanitizes copy adhering to non-causal claims enforcement", () => {
    expect(sanitizeNonCausalCopy("")).toBe("");
    expect(
      sanitizeNonCausalCopy("Work caused success because of focus which led to completion."),
    ).toBe(
      "Work coincided with success during periods with focus which was followed by completion.",
    );
  });
});
