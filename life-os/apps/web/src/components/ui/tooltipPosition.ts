/**
 * Where a tooltip actually fits (LOS-0326).
 *
 * Kept as a pure function so the collision rules can be tested without a layout
 * engine, and so the component holds only the wiring. Everything is in viewport
 * coordinates, which is what `getBoundingClientRect` reports.
 */

export interface TooltipRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

export interface TooltipViewport {
  readonly width: number;
  readonly height: number;
}

export type TooltipSide = "top" | "bottom";

export interface TooltipPosition {
  readonly side: TooltipSide;
  /**
   * Horizontal correction from the centred position, in pixels. Positive
   * pushes the tooltip right, away from the left edge.
   */
  readonly shift: number;
}

const DEFAULT_MARGIN = 8;

export function resolveTooltipPosition(
  trigger: TooltipRect,
  tooltip: { readonly width: number; readonly height: number },
  viewport: TooltipViewport,
  preferred: TooltipSide,
  margin: number = DEFAULT_MARGIN,
): TooltipPosition {
  return {
    side: resolveSide(trigger, tooltip.height, viewport, preferred, margin),
    shift: resolveShift(trigger, tooltip.width, viewport, margin),
  };
}

function resolveSide(
  trigger: TooltipRect,
  tooltipHeight: number,
  viewport: TooltipViewport,
  preferred: TooltipSide,
  margin: number,
): TooltipSide {
  const needed = tooltipHeight + margin;
  const roomAbove = trigger.top;
  const roomBelow = viewport.height - (trigger.top + trigger.height);

  const fitsPreferred = preferred === "top" ? roomAbove >= needed : roomBelow >= needed;
  if (fitsPreferred) {
    return preferred;
  }

  // Only flip when the other side is genuinely better. In a viewport too short
  // for either, flipping would move the tooltip without helping anyone.
  const fitsOpposite = preferred === "top" ? roomBelow >= needed : roomAbove >= needed;
  return fitsOpposite ? opposite(preferred) : preferred;
}

function resolveShift(
  trigger: TooltipRect,
  tooltipWidth: number,
  viewport: TooltipViewport,
  margin: number,
): number {
  const centredLeft = trigger.left + trigger.width / 2 - tooltipWidth / 2;
  const smallestLeft = margin;
  const largestLeft = viewport.width - tooltipWidth - margin;

  // A tooltip wider than the viewport has no valid position; pinning it to the
  // near edge at least keeps its beginning readable.
  if (largestLeft < smallestLeft) {
    return smallestLeft - centredLeft;
  }

  return Math.min(Math.max(centredLeft, smallestLeft), largestLeft) - centredLeft;
}

function opposite(side: TooltipSide): TooltipSide {
  return side === "top" ? "bottom" : "top";
}
