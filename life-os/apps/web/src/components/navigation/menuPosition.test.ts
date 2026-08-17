import { describe, expect, it } from "vitest";

import { resolveMenuPosition, type MenuRect } from "./menuPosition";

const VIEWPORT = { width: 1000, height: 800 };
const MENU = { width: 200, height: 240 };

function trigger(left: number, top: number, overrides: Partial<MenuRect> = {}): MenuRect {
  return { left, top, width: 40, height: 32, ...overrides };
}

describe("resolveMenuPosition", () => {
  it("drops below the trigger when there is room", () => {
    expect(resolveMenuPosition(trigger(400, 100), MENU, VIEWPORT).side).toBe("bottom");
  });

  it("flips above the trigger when the menu would overflow the bottom edge", () => {
    expect(resolveMenuPosition(trigger(400, 700), MENU, VIEWPORT).side).toBe("top");
  });

  it("stays below when neither side has room, rather than flipping for no benefit", () => {
    // Room below (100px) exceeds room above (40px); a menu taller than both
    // must not flip to the smaller side.
    const shortViewport = { width: 1000, height: 172 };
    expect(resolveMenuPosition(trigger(400, 40), MENU, shortViewport).side).toBe("bottom");
  });

  it("aligns to the trigger's start edge by default", () => {
    expect(resolveMenuPosition(trigger(400, 100), MENU, VIEWPORT).align).toBe("start");
  });

  it("flips to end alignment when start would overflow the right edge", () => {
    expect(resolveMenuPosition(trigger(900, 100), MENU, VIEWPORT).align).toBe("end");
  });

  it("flips to start alignment when a preferred end would overflow the left edge", () => {
    const position = resolveMenuPosition(trigger(20, 100), MENU, VIEWPORT, "end");
    expect(position.align).toBe("start");
  });

  it("keeps the preferred align when neither edge truly fits", () => {
    const narrowViewport = { width: 220, height: 800 };
    expect(resolveMenuPosition(trigger(20, 100), MENU, narrowViewport, "start").align).toBe(
      "start",
    );
  });

  it("respects a caller-supplied margin", () => {
    // Trigger sits exactly at the right edge minus menu width; a larger
    // margin should push the align decision to flip where the default would
    // not have.
    const position = resolveMenuPosition(trigger(790, 100), MENU, VIEWPORT, "start", 20);
    expect(position.align).toBe("end");
  });
});
