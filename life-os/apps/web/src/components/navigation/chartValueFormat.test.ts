import { describe, expect, it } from "vitest";

import { formatChartPercent, formatChartValue } from "./chartValueFormat";

describe("formatChartValue", () => {
  it("formats a large value compactly", () => {
    expect(formatChartValue(12345, "en-US")).toBe("12.3K");
  });

  it("formats a small value plainly", () => {
    expect(formatChartValue(42, "en-US")).toBe("42");
  });

  it("formats a negative value with its sign", () => {
    expect(formatChartValue(-8, "en-US")).toBe("-8");
  });
});

describe("formatChartPercent", () => {
  it("formats a value as a percentage of the total", () => {
    expect(formatChartPercent(25, 100, "en-US")).toBe("25%");
  });

  it("returns 0% when the total is zero rather than dividing by zero", () => {
    expect(formatChartPercent(5, 0, "en-US")).toBe("0%");
  });

  it("clamps a negative value to zero", () => {
    expect(formatChartPercent(-5, 100, "en-US")).toBe("0%");
  });
});
