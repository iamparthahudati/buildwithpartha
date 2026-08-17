/**
 * Pure scale math shared by `BarChart`/`LineChart`/`DonutChart` (LOS-0429).
 *
 * Kept apart from any component for the same reason `paginationRange.ts` and
 * `menuPosition.ts` are: geometry a chart needs is arithmetic, not markup,
 * and arithmetic is worth testing directly rather than only through a
 * rendered SVG a jsdom test cannot lay out.
 */

/** Maps a value in `domain` linearly onto `range`. Degenerate domains map to the range's midpoint. */
export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;

  if (d1 === d0) {
    return () => (r0 + r1) / 2;
  }

  return (value: number) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

/**
 * A value domain that always includes zero — a bar or line chart's baseline
 * — and never collapses to a single point even when every value is
 * identical (a flat all-zero series would otherwise divide by zero in
 * `linearScale`).
 */
export function valueDomain(values: readonly number[]): readonly [number, number] {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);

  if (min === max) {
    return [min - 1, max + 1];
  }

  return [min, max];
}

export interface ArcSegment {
  readonly startAngle: number;
  readonly endAngle: number;
}

/**
 * Splits non-negative `values` into consecutive arc segments summing to a
 * full circle (`2π`), in the order given. A donut slice cannot have negative
 * area, so a negative input is read as zero here rather than rejected —
 * the same "clamped for display" choice `TimerRing` (LOS-0427) makes for a
 * `remainingSeconds` outside `[0, totalSeconds]`.
 */
export function donutSegments(values: readonly number[]): readonly ArcSegment[] {
  const clamped = values.map((value) => Math.max(0, value));
  const total = clamped.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return clamped.map(() => ({ startAngle: 0, endAngle: 0 }));
  }

  let cursor = 0;
  return clamped.map((value) => {
    const startAngle = cursor;
    const sweep = (value / total) * 2 * Math.PI;
    cursor += sweep;
    return { startAngle, endAngle: cursor };
  });
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A point on a circle of `radius` centered at `(cx, cy)`, `angle` measured clockwise from twelve o'clock. */
export function pointOnCircle(cx: number, cy: number, radius: number, angle: number): Point {
  // Rotated -90° (subtracting π/2) so angle 0 sits at twelve o'clock rather
  // than SVG's own three-o'clock zero — the conventional start for a donut.
  const rotated = angle - Math.PI / 2;
  return { x: cx + radius * Math.cos(rotated), y: cy + radius * Math.sin(rotated) };
}

/**
 * An SVG arc `<path>` `d` string for a donut slice — an outer arc, a step
 * in to the inner radius, an inner arc back, and a close — the standard
 * "stroke a ring" path shape, not a full pie wedge to the center.
 */
export function donutSlicePath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  segment: ArcSegment,
): string {
  const rawSweep = segment.endAngle - segment.startAngle;
  if (rawSweep <= 0) {
    return "";
  }

  // A sweep of exactly a full circle makes the arc's start and end points
  // coincide, which SVG cannot draw as a visible arc at all (an ambiguous,
  // zero-length command). Falling a hair short of 2π keeps a single 100%
  // segment visible as what is, to the eye, still a complete ring.
  const sweep = Math.min(rawSweep, 2 * Math.PI - 0.0001);
  const endAngle = segment.startAngle + sweep;

  const largeArc = sweep > Math.PI ? 1 : 0;
  const outerStart = pointOnCircle(cx, cy, outerRadius, segment.startAngle);
  const outerEnd = pointOnCircle(cx, cy, outerRadius, endAngle);
  const innerStart = pointOnCircle(cx, cy, innerRadius, segment.startAngle);
  const innerEnd = pointOnCircle(cx, cy, innerRadius, endAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}
