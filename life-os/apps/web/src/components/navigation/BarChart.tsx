import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import { COLOR_SWATCHES, type ColorSwatchName } from "@components/forms";

import { linearScale, valueDomain } from "./chartScale";
import { formatChartValue } from "./chartValueFormat";
import { ChartTooltip } from "./ChartTooltip";
import type { ChartDatum } from "./chartTypes";
import "./bar-chart.css";

/**
 * BarChart (LOS-0429).
 *
 * A hand-rolled SVG, not a charting dependency: `DEPENDENCY-POLICY.md`
 * treats a new direct package as its own deliberate, reviewable ticket, not
 * something an application ticket adds as incidental cleanup. The whole
 * `0–100` viewBox on both axes, stretched with `preserveAspectRatio="none"`,
 * is what makes this "responsive" without a resize observer — the SVG
 * simply fills whatever box its container (typically `ChartFrame`, LOS-0428)
 * gives it, and `ChartTooltip`'s percentage positioning falls out of the
 * same coordinate system for free.
 *
 * Every bar grows from a zero baseline (`chartScale.ts`'s `valueDomain`
 * always includes zero), so a negative value renders as a bar extending
 * below that baseline rather than a value the scale silently clips.
 *
 * Keyboard access is a roving `tabIndex` across the bars — `Menu`'s own
 * mechanics (LOS-0415): ArrowLeft/ArrowRight move it, Home/End jump to the
 * ends, and an effect moves real DOM focus to match (skipped on the very
 * first render, so mounting the chart never steals focus on its own) —
 * without it, only the `tabIndex` attribute would move while the browser's
 * actual focus, and the tooltip it drives, stayed behind on the old bar.
 * Whichever bar currently holds real focus is also the one showing its
 * value in `ChartTooltip`, so a keyboard user reaches the same information
 * a pointer user gets from hovering.
 */

export interface BarChartProps {
  readonly data: readonly ChartDatum[];
  /** The chart's accessible name, e.g. "Tasks completed by day". */
  readonly label: string;
  readonly locale: string;
  readonly valueFormatter?: (value: number) => string;
  readonly className?: string;
}

const DEFAULT_COLOR_ORDER: readonly ColorSwatchName[] = COLOR_SWATCHES.map((swatch) => swatch.name);
const VIEWBOX_SIZE = 100;
const BAR_GAP_RATIO = 0.25;

export function BarChart({ data, label, locale, valueFormatter, className }: BarChartProps) {
  const chartId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [rovingIndex, setRovingIndex] = useState(0);

  // Skipped on mount: only an actual arrow-key move should pull real DOM
  // focus onto the roving bar, never the chart's own first render.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    document.getElementById(barId(chartId, rovingIndex))?.focus();
  }, [rovingIndex, chartId]);

  const format = valueFormatter ?? ((value: number) => formatChartValue(value, locale));
  const domain = valueDomain(data.map((datum) => datum.value));
  const yScale = linearScale(domain, [VIEWBOX_SIZE, 0]);
  const zeroY = yScale(0);

  const slotWidth = data.length > 0 ? VIEWBOX_SIZE / data.length : VIEWBOX_SIZE;
  const barWidth = slotWidth * (1 - BAR_GAP_RATIO);

  function moveRoving(delta: 1 | -1) {
    if (data.length === 0) {
      return;
    }
    setRovingIndex((current) => (current + delta + data.length) % data.length);
  }

  function handleKeyDown(event: KeyboardEvent<SVGRectElement>) {
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

  return (
    <div className={["lifeos-bar-chart", className].filter(Boolean).join(" ")}>
      <svg
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
        className="lifeos-bar-chart__svg"
      >
        <line
          x1={0}
          y1={zeroY}
          x2={VIEWBOX_SIZE}
          y2={zeroY}
          className="lifeos-bar-chart__baseline"
        />

        {data.map((datum, index) => {
          const barY = yScale(Math.max(0, datum.value));
          const barBottom = yScale(Math.min(0, datum.value));
          const height = Math.max(0, barBottom - barY);
          const x = index * slotWidth + (slotWidth - barWidth) / 2;
          const colorName =
            datum.colorName ?? DEFAULT_COLOR_ORDER[index % DEFAULT_COLOR_ORDER.length];
          const token = COLOR_SWATCHES.find((swatch) => swatch.name === colorName)?.token;

          return (
            <rect
              key={datum.id}
              id={barId(chartId, index)}
              x={x}
              y={barY}
              width={barWidth}
              height={height || 0.5}
              tabIndex={rovingIndex === index ? 0 : -1}
              role="img"
              aria-label={`${datum.label}: ${format(datum.value)}`}
              className="lifeos-bar-chart__bar"
              style={
                {
                  "--lifeos-chart-bar-color": `var(${token ?? "--lifeos-chart-1"})`,
                } as CSSProperties
              }
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onPointerEnter={() => setActiveIndex(index)}
              onPointerLeave={() => setActiveIndex(null)}
              onKeyDown={handleKeyDown}
            />
          );
        })}
      </svg>

      <div className="lifeos-bar-chart__labels" aria-hidden="true">
        {data.map((datum) => (
          <span key={datum.id} className="lifeos-bar-chart__label">
            {datum.label}
          </span>
        ))}
      </div>

      {active && activeIndex !== null ? (
        <ChartTooltip
          active
          xPercent={(activeIndex + 0.5) * slotWidth}
          yPercent={yScale(Math.max(0, active.value))}
        >
          {active.label}: {format(active.value)}
        </ChartTooltip>
      ) : null}
    </div>
  );
}

function barId(chartId: string, index: number): string {
  return `${chartId}-bar-${index}`;
}
