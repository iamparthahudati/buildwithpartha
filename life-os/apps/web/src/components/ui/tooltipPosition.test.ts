import { describe, expect, it } from "vitest";

import { resolveTooltipPosition } from "./tooltipPosition";

const VIEWPORT = { width: 1000, height: 800 };
const BUBBLE = { width: 200, height: 40 };

/** A 100×32 trigger placed by its top-left corner. */
function trigger(left: number, top: number) {
  return { left, top, width: 100, height: 32 };
}

describe("resolveTooltipPosition", () => {
  it("keeps the requested side when there is room for it", () => {
    expect(resolveTooltipPosition(trigger(400, 400), BUBBLE, VIEWPORT, "top")).toEqual({
      side: "top",
      shift: 0,
    });
  });

  it("flips below a trigger that is too close to the top", () => {
    // 10px of room above cannot hold a 40px bubble plus its margin.
    expect(resolveTooltipPosition(trigger(400, 10), BUBBLE, VIEWPORT, "top").side).toBe("bottom");
  });

  it("flips above a trigger that is too close to the bottom", () => {
    expect(resolveTooltipPosition(trigger(400, 780), BUBBLE, VIEWPORT, "bottom").side).toBe("top");
  });

  it("stays put when neither side fits, instead of moving for nothing", () => {
    const shortViewport = { width: 1000, height: 60 };

    expect(resolveTooltipPosition(trigger(400, 14), BUBBLE, shortViewport, "top").side).toBe("top");
  });

  it("pushes a tooltip back inside the left edge", () => {
    // Centred on a trigger at x=0 the bubble would start at -50.
    const { shift } = resolveTooltipPosition(trigger(0, 400), BUBBLE, VIEWPORT, "top");

    expect(shift).toBe(58);
  });

  it("pulls a tooltip back inside the right edge", () => {
    const { shift } = resolveTooltipPosition(trigger(950, 400), BUBBLE, VIEWPORT, "top");

    expect(shift).toBeLessThan(0);
    expect(950 + 50 - 100 + shift).toBe(VIEWPORT.width - BUBBLE.width - 8);
  });

  it("pins a tooltip wider than the viewport to the near edge", () => {
    const wide = { width: 1200, height: 40 };
    const narrowViewport = { width: 320, height: 800 };

    // There is no position that fits; showing the beginning beats showing the
    // middle of a sentence.
    const { shift } = resolveTooltipPosition(trigger(100, 400), wide, narrowViewport, "top");
    expect(100 + 50 - 600 + shift).toBe(8);
  });
});
