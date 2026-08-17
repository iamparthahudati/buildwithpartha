import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { linearScale, valueDomain } from "./chartScale";
import { formatChartValue } from "./chartValueFormat";
import { ChartTooltip } from "./ChartTooltip";
import type { ChartDatum } from "./chartTypes";
import "./line-chart.css";

/**
 * LineChart (LOS-0429).
 *
 * Shares `BarChart`'s coordinate system, keyboard mechanics and tooltip —
 * see that file's own doc comment for the reasoning behind the `0–100`
 * viewBox, `preserveAspectRatio="none"` and roving `tabIndex`. This file
 * only covers what genuinely differs: a `<polyline>` connecting the points
 * rather than bars from a baseline, and a dashed zero reference line
 * (`chartScale.ts`'s `valueDomain` still always includes zero) so a series
 * that dips negative reads clearly against it rather than only against the
 * chart's own top/bottom edges.
 */

export interface LineChartProps {
  readonly data: readonly ChartDatum[];
  /** The chart's accessible name, e.g. "Focus minutes per day". */
  readonly label: string;
  readonly locale: string;
  readonly valueFormatter?: (value: number) => string;
  readonly className?: string;
}

const VIEWBOX_SIZE = 100;
const POINT_RADIUS = 1.5;

export function LineChart({ data, label, locale, valueFormatter, className }: LineChartProps) {
  const chartId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [rovingIndex, setRovingIndex] = useState(0);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    document.getElementById(pointId(chartId, rovingIndex))?.focus();
  }, [rovingIndex, chartId]);

  const format = valueFormatter ?? ((value: number) => formatChartValue(value, locale));
  const domain = valueDomain(data.map((datum) => datum.value));
  const yScale = linearScale(domain, [VIEWBOX_SIZE, 0]);
  const zeroY = yScale(0);

  const xForIndex = (index: number) =>
    data.length <= 1 ? VIEWBOX_SIZE / 2 : (index / (data.length - 1)) * VIEWBOX_SIZE;

  const points = data.map((datum, index) => ({
    x: xForIndex(index),
    y: yScale(datum.value),
  }));
  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  function moveRoving(delta: 1 | -1) {
    if (data.length === 0) {
      return;
    }
    setRovingIndex((current) => (current + delta + data.length) % data.length);
  }

  function handleKeyDown(event: KeyboardEvent<SVGCircleElement>) {
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
    <div className={["lifeos-line-chart", className].filter(Boolean).join(" ")}>
      <svg
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
        className="lifeos-line-chart__svg"
      >
        <line
          x1={0}
          y1={zeroY}
          x2={VIEWBOX_SIZE}
          y2={zeroY}
          className="lifeos-line-chart__baseline"
        />

        {points.length > 1 ? (
          <polyline points={polylinePoints} className="lifeos-line-chart__line" />
        ) : null}

        {data.map((datum, index) => {
          const point = points[index];
          if (point === undefined) {
            return null;
          }

          return (
            <circle
              key={datum.id}
              id={pointId(chartId, index)}
              cx={point.x}
              cy={point.y}
              r={POINT_RADIUS}
              tabIndex={rovingIndex === index ? 0 : -1}
              role="img"
              aria-label={`${datum.label}: ${format(datum.value)}`}
              className="lifeos-line-chart__point"
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onPointerEnter={() => setActiveIndex(index)}
              onPointerLeave={() => setActiveIndex(null)}
              onKeyDown={handleKeyDown}
            />
          );
        })}
      </svg>

      <div className="lifeos-line-chart__labels" aria-hidden="true">
        {data.map((datum) => (
          <span key={datum.id} className="lifeos-line-chart__label">
            {datum.label}
          </span>
        ))}
      </div>

      {active && activeIndex !== null ? (
        <ChartTooltip
          active
          xPercent={points[activeIndex]?.x ?? 0}
          yPercent={points[activeIndex]?.y ?? 0}
        >
          {active.label}: {format(active.value)}
        </ChartTooltip>
      ) : null}
    </div>
  );
}

function pointId(chartId: string, index: number): string {
  return `${chartId}-point-${index}`;
}
