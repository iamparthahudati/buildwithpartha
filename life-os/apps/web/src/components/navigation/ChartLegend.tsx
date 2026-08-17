import type { CSSProperties } from "react";

import { COLOR_SWATCHES, type ColorSwatchName } from "@components/forms";

import "./chart-legend.css";

/**
 * ChartLegend (LOS-0428).
 *
 * Reuses the eight frozen chart tokens `ColorIconPicker` (LOS-0407) already
 * named — `colorName` stores the same `ColorSwatchName`, never a raw token
 * or hex value, so a legend and a project's own color/icon appearance can
 * never drift onto two different scales for the same eight colors.
 *
 * An item is a toggle button only when the caller supplies `onToggle` — the
 * same "no handler, no control" split the rest of this epic already uses
 * (`FormDialog`'s actions, `TimerRing`'s actions). A purely descriptive
 * legend renders plain, non-interactive rows instead of buttons that do
 * nothing.
 */

export interface ChartLegendItem {
  readonly id: string;
  readonly label: string;
  readonly colorName: ColorSwatchName;
  /** A formatted value shown beside the label, e.g. "42%" or "12 tasks". */
  readonly value?: string;
  /** Whether this series is currently shown. Only meaningful with `onToggle`. */
  readonly active?: boolean;
  /** Present, the item becomes a real toggle button for hiding/showing its series. */
  readonly onToggle?: () => void;
}

export interface ChartLegendProps {
  readonly items: readonly ChartLegendItem[];
  /** The legend's accessible name, e.g. "Tasks by status". Never visible text. */
  readonly label: string;
  readonly className?: string;
}

export function ChartLegend({ items, label, className }: ChartLegendProps) {
  return (
    <ul className={["lifeos-chart-legend", className].filter(Boolean).join(" ")} aria-label={label}>
      {items.map((item) => {
        const swatchStyle = {
          "--lifeos-chart-legend-color": `var(${tokenFor(item.colorName)})`,
        } as CSSProperties;
        const active = item.active ?? true;

        return (
          <li key={item.id}>
            {item.onToggle ? (
              <button
                type="button"
                className={[
                  "lifeos-chart-legend__item",
                  "lifeos-chart-legend__item--toggle",
                  !active && "is-inactive",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={active}
                onClick={item.onToggle}
              >
                <span
                  className="lifeos-chart-legend__swatch"
                  aria-hidden="true"
                  style={swatchStyle}
                />
                <span className="lifeos-chart-legend__label">{item.label}</span>
                {item.value ? (
                  <span className="lifeos-chart-legend__value">{item.value}</span>
                ) : null}
              </button>
            ) : (
              <span className="lifeos-chart-legend__item">
                <span
                  className="lifeos-chart-legend__swatch"
                  aria-hidden="true"
                  style={swatchStyle}
                />
                <span className="lifeos-chart-legend__label">{item.label}</span>
                {item.value ? (
                  <span className="lifeos-chart-legend__value">{item.value}</span>
                ) : null}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function tokenFor(colorName: ColorSwatchName): string {
  return COLOR_SWATCHES.find((swatch) => swatch.name === colorName)?.token ?? "--lifeos-chart-1";
}
