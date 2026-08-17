/**
 * Locale-aware value formatting shared by `BarChart`/`LineChart`/`DonutChart`
 * (LOS-0429).
 *
 * `notation: "compact"` (Intl.NumberFormat) reads a large value the way a
 * dense chart label needs — "12.3k" rather than "12,345" — and has shipped
 * since Firefox 90/Safari 14.1, safely inside this project's frozen
 * minimum browser target (`lib/duration.ts` documents the same target for
 * the same reason it avoids the newer `Intl.DurationFormat`).
 */
export function formatChartValue(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

/** A whole-number percentage of `value` against `total`, `0` when `total` is `0`. */
export function formatChartPercent(value: number, total: number, locale: string): string {
  if (total <= 0) {
    return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(0);
  }
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(
    Math.max(0, value) / total,
  );
}
