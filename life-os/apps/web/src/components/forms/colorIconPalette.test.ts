import { describe, expect, it } from "vitest";

import { CONTRAST_MINIMUM, contrastRatio } from "@styles/contrast";
import { CHART_TOKENS, COLOR_TOKENS } from "@styles/tokens";

import { COLOR_SWATCHES, ICON_OPTIONS } from "./colorIconPalette";

/**
 * Proves the claim `ColorIconPicker`'s preview makes: every swatch is safe as
 * a solid fill under the white icon/text used on top of it. This is the same
 * technique `styles/tokens.test.ts` already uses for the frozen status-color
 * pairings, computed from real WCAG math rather than assumed — the chart
 * tokens this palette reuses were chosen in LOS-0301 to be *distinguishable*
 * from each other, not proven safe as a solid background, so this is a real
 * check rather than a formality.
 */
describe("COLOR_SWATCHES", () => {
  it("names all eight frozen chart tokens, in their declared order", () => {
    expect(COLOR_SWATCHES.map((swatch) => swatch.token)).toEqual([
      "--lifeos-chart-1",
      "--lifeos-chart-2",
      "--lifeos-chart-3",
      "--lifeos-chart-4",
      "--lifeos-chart-5",
      "--lifeos-chart-6",
      "--lifeos-chart-7",
      "--lifeos-chart-8",
    ]);
  });

  it("clears AA as a solid fill under the white icon the preview draws on top", () => {
    const white = COLOR_TOKENS["--lifeos-color-text-on-solid"];

    for (const swatch of COLOR_SWATCHES) {
      const hex = CHART_TOKENS[swatch.token as keyof typeof CHART_TOKENS];
      const ratio = contrastRatio(white, hex);

      expect(ratio, `${swatch.name} (${swatch.token})`).toBeGreaterThanOrEqual(
        CONTRAST_MINIMUM.normalText,
      );
    }
  });

  it("gives every swatch a distinct stored name", () => {
    const names = COLOR_SWATCHES.map((swatch) => swatch.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("ICON_OPTIONS", () => {
  it("gives every icon a distinct stored name", () => {
    const names = ICON_OPTIONS.map((option) => option.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("stays a small curated list rather than the whole icon library", () => {
    expect(ICON_OPTIONS.length).toBeLessThanOrEqual(16);
    expect(ICON_OPTIONS.length).toBeGreaterThan(0);
  });
});
