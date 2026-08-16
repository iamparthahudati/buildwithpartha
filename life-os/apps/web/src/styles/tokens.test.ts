import { describe, expect, it } from "vitest";

import {
  CONTRAST_MINIMUM,
  contrastRatio,
  meetsContrast,
  parseHexColor,
  relativeLuminance,
} from "./contrast";
import {
  BREAKPOINTS,
  CHART_SERIES_TOKENS,
  CHART_TOKENS,
  COLOR_TOKENS,
  CONTRAST_REQUIREMENTS,
  MIN_SUPPORTED_VIEWPORT_WIDTH,
  Z_INDEX,
} from "./tokens";

/*
 * This suite proves the frozen token values. The stylesheet itself is parsed and
 * compared against these values by `tests/design-tokens.test.mjs`, which runs in
 * Node where the file system is available.
 */

describe("contrast math", () => {
  it("computes the known WCAG reference ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // Order must not matter.
    expect(contrastRatio("#ffffff", "#767676")).toBeCloseTo(
      contrastRatio("#767676", "#ffffff"),
      10,
    );
  });

  it("uses both the linear and gamma channel branches", () => {
    expect(relativeLuminance(parseHexColor("#000000"))).toBe(0);
    expect(relativeLuminance(parseHexColor("#ffffff"))).toBeCloseTo(1, 10);
    // #0a0a0a stays below the 0.04045 threshold and exercises the linear branch.
    expect(relativeLuminance(parseHexColor("#0a0a0a"))).toBeGreaterThan(0);
  });

  it("parses six-digit hex colors and rejects anything else", () => {
    expect(parseHexColor("#3157f5")).toEqual({ red: 0x31, green: 0x57, blue: 0xf5 });
    expect(() => parseHexColor("#fff")).toThrow(/six-digit hex color/);
    expect(() => parseHexColor("rgb(0 0 0)")).toThrow(/six-digit hex color/);
  });

  it("reports whether a pairing meets a minimum", () => {
    expect(meetsContrast("#101828", "#ffffff", CONTRAST_MINIMUM.normalText)).toBe(true);
    // 3.46:1 — enough for a border, not enough for body text.
    expect(meetsContrast("#7d8b9f", "#ffffff", CONTRAST_MINIMUM.normalText)).toBe(false);
    expect(meetsContrast("#7d8b9f", "#ffffff", CONTRAST_MINIMUM.nonText)).toBe(true);
  });
});

describe("accessible color contract", () => {
  it.each(
    CONTRAST_REQUIREMENTS.map(
      (requirement) =>
        [
          `${requirement.usage} (${requirement.foreground} on ${requirement.background})`,
          requirement,
        ] as const,
    ),
  )("passes WCAG 2.2 AA for %s", (_label, requirement) => {
    const ratio = contrastRatio(
      COLOR_TOKENS[requirement.foreground],
      COLOR_TOKENS[requirement.background],
    );

    expect(ratio).toBeGreaterThanOrEqual(requirement.minimum);
  });

  it("covers every text and status token with at least one proven pairing", () => {
    const proven = new Set(
      CONTRAST_REQUIREMENTS.flatMap((requirement) => [requirement.foreground]),
    );

    for (const token of [
      "--lifeos-color-text",
      "--lifeos-color-text-secondary",
      "--lifeos-color-text-muted",
      "--lifeos-color-text-on-solid",
      "--lifeos-color-primary",
      "--lifeos-color-success",
      "--lifeos-color-warning",
      "--lifeos-color-danger",
      "--lifeos-color-info",
      "--lifeos-color-accent",
      "--lifeos-color-focus-ring",
    ] as const) {
      expect(proven.has(token), `${token} has no proven contrast pairing`).toBe(true);
    }
  });

  it("keeps every categorical chart series distinguishable from the surface", () => {
    for (const series of CHART_SERIES_TOKENS) {
      expect(
        contrastRatio(CHART_TOKENS[series], COLOR_TOKENS["--lifeos-color-surface"]),
      ).toBeGreaterThanOrEqual(CONTRAST_MINIMUM.nonText);
    }
  });

  it("keeps every categorical chart series a distinct value", () => {
    const values = CHART_SERIES_TOKENS.map((series) => CHART_TOKENS[series]);
    expect(new Set(values).size).toBe(values.length);
  });

  it("keeps chart labels legible and gridlines quieter than the axis", () => {
    const surface = COLOR_TOKENS["--lifeos-color-surface"];
    expect(contrastRatio(CHART_TOKENS["--lifeos-chart-axis"], surface)).toBeGreaterThanOrEqual(
      CONTRAST_MINIMUM.normalText,
    );
    expect(contrastRatio(CHART_TOKENS["--lifeos-chart-grid"], surface)).toBeLessThan(
      contrastRatio(CHART_TOKENS["--lifeos-chart-axis"], surface),
    );
  });
});

describe("scale contracts", () => {
  it("keeps the stacking order strictly ascending and unique", () => {
    const order = Object.values(Z_INDEX);
    expect([...order].sort((first, second) => first - second)).toEqual(order);
    expect(new Set(order).size).toBe(order.length);
  });

  it("keeps breakpoints ascending and above the minimum supported width", () => {
    const widths = Object.values(BREAKPOINTS);
    expect([...widths].sort((first, second) => first - second)).toEqual(widths);
    expect(Math.min(...widths)).toBeGreaterThan(MIN_SUPPORTED_VIEWPORT_WIDTH);
  });

  it("supports the smallest documented viewport", () => {
    expect(MIN_SUPPORTED_VIEWPORT_WIDTH).toBe(320);
  });

  it("declares only lowercase six-digit hex values so contrast math never throws", () => {
    for (const value of [...Object.values(COLOR_TOKENS), ...Object.values(CHART_TOKENS)]) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
