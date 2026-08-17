/**
 * Where a Menu popup actually fits (LOS-0415).
 *
 * A pure function for the same reason `tooltipPosition.ts` (LOS-0326) is one:
 * the collision rules need to be testable without a layout engine, and the
 * component should hold only the wiring. Coordinates are viewport-relative,
 * matching `getBoundingClientRect`.
 *
 * Unlike a tooltip, a menu popup is corner-anchored rather than centered: it
 * hangs from one edge of the trigger and aligns to one of its sides, so the
 * two axes are resolved independently as a `side` (which edge it drops from)
 * and an `align` (which side of the trigger it lines up with).
 */

export type MenuSide = "top" | "bottom";
export type MenuAlign = "start" | "end";

export interface MenuRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

export interface MenuViewport {
  readonly width: number;
  readonly height: number;
}

export interface MenuPosition {
  readonly side: MenuSide;
  readonly align: MenuAlign;
}

const DEFAULT_MARGIN = 8;

export function resolveMenuPosition(
  trigger: MenuRect,
  menu: { readonly width: number; readonly height: number },
  viewport: MenuViewport,
  preferredAlign: MenuAlign = "start",
  margin: number = DEFAULT_MARGIN,
): MenuPosition {
  return {
    side: resolveSide(trigger, menu.height, viewport, margin),
    align: resolveAlign(trigger, menu.width, viewport, preferredAlign, margin),
  };
}

/** A menu always prefers to drop below the trigger, like a native select. */
function resolveSide(
  trigger: MenuRect,
  menuHeight: number,
  viewport: MenuViewport,
  margin: number,
): MenuSide {
  const needed = menuHeight + margin;
  const roomBelow = viewport.height - (trigger.top + trigger.height);
  if (roomBelow >= needed) {
    return "bottom";
  }

  // Only flip up when it is genuinely better than staying put. A viewport too
  // short for either placement keeps the default rather than flipping for no
  // benefit.
  const roomAbove = trigger.top;
  return roomAbove > roomBelow ? "top" : "bottom";
}

function resolveAlign(
  trigger: MenuRect,
  menuWidth: number,
  viewport: MenuViewport,
  preferred: MenuAlign,
  margin: number,
): MenuAlign {
  const fitsStart = trigger.left + menuWidth <= viewport.width - margin;
  const fitsEnd = trigger.left + trigger.width - menuWidth >= margin;

  const fitsPreferred = preferred === "start" ? fitsStart : fitsEnd;
  if (fitsPreferred) {
    return preferred;
  }

  const fitsOpposite = preferred === "start" ? fitsEnd : fitsStart;
  return fitsOpposite ? opposite(preferred) : preferred;
}

function opposite(align: MenuAlign): MenuAlign {
  return align === "start" ? "end" : "start";
}
