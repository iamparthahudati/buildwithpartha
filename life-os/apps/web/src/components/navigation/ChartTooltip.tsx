import type { ReactNode } from "react";

import "./chart-tooltip.css";

/**
 * The floating value bubble shared by `BarChart`/`LineChart`/`DonutChart`
 * (LOS-0429). Not exported from `components/navigation` — an internal
 * implementation detail of those three, not a public contract of its own.
 *
 * Positioned by percentage (`xPercent`/`yPercent`) rather than a measured
 * pixel rectangle: every chart's SVG uses a `0–100` viewBox on both axes
 * with `preserveAspectRatio="none"`, so a data point's own viewBox
 * coordinates already *are* the percentage of the rendered container it
 * needs — no `getBoundingClientRect`, no `ResizeObserver`, and it stays
 * correct through a resize for free.
 */

export interface ChartTooltipProps {
  readonly active: boolean;
  readonly xPercent: number;
  readonly yPercent: number;
  readonly children: ReactNode;
}

export function ChartTooltip({ active, xPercent, yPercent, children }: ChartTooltipProps) {
  if (!active) {
    return null;
  }

  return (
    <div
      role="tooltip"
      className="lifeos-chart-tooltip"
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
    >
      {children}
    </div>
  );
}
