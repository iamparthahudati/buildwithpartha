import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import { COLOR_SWATCHES } from "@components/forms";

import { donutSegments, donutSlicePath, pointOnCircle } from "./chartScale";
import { formatChartPercent, formatChartValue } from "./chartValueFormat";
import { ChartTooltip } from "./ChartTooltip";
import type { ChartDatum } from "./chartTypes";
import "./donut-chart.css";

/**
 * DonutChart (LOS-0429).
 *
 * A pie slice is area, and area cannot be negative — unlike `BarChart`'s
 * bars or `LineChart`'s points, a negative value here is clamped to zero by
 * `chartScale.ts`'s own `donutSegments`, the same "clamped for display"
 * reading `TimerRing` (LOS-0427) already gives an out-of-range
 * `remainingSeconds`. A series that sums to zero (every value zero or
 * negative) renders as a plain track-colored ring — `ProgressRing`'s own
 * `is-empty` treatment (LOS-0322) — rather than nothing at all.
 *
 * Keyboard access is the same roving `tabIndex` `BarChart`/`LineChart` use;
 * arrow keys move between slices and the held one is what `ChartTooltip`
 * shows, computed from the slice's own midpoint angle at the outer radius —
 * no separate geometry for the tooltip anchor.
 */

export interface DonutChartProps {
  readonly data: readonly ChartDatum[];
  /** The chart's accessible name, e.g. "Tasks by status". */
  readonly label: string;
  readonly locale: string;
  readonly valueFormatter?: (value: number) => string;
  /** Overrides the default total-with-percent text in the center. */
  readonly centerText?: string;
  readonly className?: string;
}

const DEFAULT_COLOR_ORDER = COLOR_SWATCHES.map((swatch) => swatch.name);
const CENTER = 50;
const OUTER_RADIUS = 45;
const INNER_RADIUS = 26;

export function DonutChart({
  data,
  label,
  locale,
  valueFormatter,
  centerText,
  className,
}: DonutChartProps) {
  const chartId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [rovingIndex, setRovingIndex] = useState(0);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    document.getElementById(sliceId(chartId, rovingIndex))?.focus();
  }, [rovingIndex, chartId]);

  const format = valueFormatter ?? ((value: number) => formatChartValue(value, locale));
  const total = data.reduce((sum, datum) => sum + Math.max(0, datum.value), 0);
  const segments = donutSegments(data.map((datum) => datum.value));
  const isEmpty = total <= 0;

  function moveRoving(delta: 1 | -1) {
    if (data.length === 0) {
      return;
    }
    setRovingIndex((current) => (current + delta + data.length) % data.length);
  }

  function handleKeyDown(event: KeyboardEvent<SVGPathElement>) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveRoving(1);
        return;
      case "ArrowLeft":
        event.preventDefault();
        moveRoving(-1);
        return;
      case "Home":
        event.preventDefault();
        setRovingIndex(0);
        return;
      case "End":
        event.preventDefault();
        setRovingIndex(data.length - 1);
        return;
      default:
        return;
    }
  }

  const active = activeIndex === null ? null : data[activeIndex];
  const activeSegment = activeIndex === null ? undefined : segments[activeIndex];
  const activeTooltipPoint =
    activeSegment === undefined
      ? undefined
      : pointOnCircle(
          CENTER,
          CENTER,
          OUTER_RADIUS,
          (activeSegment.startAngle + activeSegment.endAngle) / 2,
        );

  return (
    <div className={["lifeos-donut-chart", className].filter(Boolean).join(" ")}>
      <svg viewBox="0 0 100 100" role="img" aria-label={label} className="lifeos-donut-chart__svg">
        {isEmpty ? (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={(OUTER_RADIUS + INNER_RADIUS) / 2}
            className="lifeos-donut-chart__empty-track"
            style={{ strokeWidth: OUTER_RADIUS - INNER_RADIUS }}
          />
        ) : (
          data.map((datum, index) => {
            const segment = segments[index];
            if (segment === undefined) {
              return null;
            }
            const colorName =
              datum.colorName ?? DEFAULT_COLOR_ORDER[index % DEFAULT_COLOR_ORDER.length];
            const token = COLOR_SWATCHES.find((swatch) => swatch.name === colorName)?.token;

            return (
              <path
                key={datum.id}
                id={sliceId(chartId, index)}
                d={donutSlicePath(CENTER, CENTER, OUTER_RADIUS, INNER_RADIUS, segment)}
                tabIndex={rovingIndex === index ? 0 : -1}
                role="img"
                aria-label={`${datum.label}: ${format(datum.value)}, ${formatChartPercent(datum.value, total, locale)}`}
                className="lifeos-donut-chart__slice"
                style={
                  {
                    "--lifeos-chart-slice-color": `var(${token ?? "--lifeos-chart-1"})`,
                  } as CSSProperties
                }
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                onPointerEnter={() => setActiveIndex(index)}
                onPointerLeave={() => setActiveIndex(null)}
                onKeyDown={handleKeyDown}
              />
            );
          })
        )}
      </svg>

      <span className="lifeos-donut-chart__center" aria-hidden="true">
        {centerText ?? format(total)}
      </span>

      {active && activeTooltipPoint ? (
        <ChartTooltip active xPercent={activeTooltipPoint.x} yPercent={activeTooltipPoint.y}>
          {active.label}: {format(active.value)} ({formatChartPercent(active.value, total, locale)})
        </ChartTooltip>
      ) : null}
    </div>
  );
}

function sliceId(chartId: string, index: number): string {
  return `${chartId}-slice-${index}`;
}
