import { useMemo } from "react";
import {
  ChartFrame,
  DonutChart,
  type ChartDatum,
  type ChartFrameStatus,
  type ChartLegendItem,
} from "@components/navigation";
import type { ColorSwatchName } from "@components/forms";
import { formatDurationMinutes } from "@lib/duration";
import "./time-category-breakdown.css";

export interface TimeCategoryItem {
  readonly id?: string;
  readonly name: string;
  readonly minutes: number;
  readonly colorName?: ColorSwatchName;
}

export interface TimeCategoryBreakdownProps {
  readonly status: ChartFrameStatus;
  readonly categories?: readonly TimeCategoryItem[];
  readonly title?: string;
  readonly summary?: string;
  readonly locale?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

const DEFAULT_COLOR_ORDER: readonly ColorSwatchName[] = [
  "blue",
  "teal",
  "purple",
  "amber",
  "green",
  "magenta",
  "red",
  "olive",
];

function resolveColorName(catColor?: ColorSwatchName, index: number = 0): ColorSwatchName {
  if (catColor) {
    return catColor;
  }
  const fallback = DEFAULT_COLOR_ORDER[index % DEFAULT_COLOR_ORDER.length];
  return fallback ?? "blue";
}

export function TimeCategoryBreakdown({
  status,
  categories = [],
  title = "Time allocation by category",
  summary,
  locale = "en-US",
  onRetry,
  className = "",
}: TimeCategoryBreakdownProps) {
  const chartData = useMemo<readonly ChartDatum[]>(() => {
    return categories.map((cat, index) => ({
      id: cat.id ?? cat.name,
      label: cat.name,
      value: cat.minutes,
      colorName: resolveColorName(cat.colorName, index),
    }));
  }, [categories]);

  const legendItems = useMemo<readonly ChartLegendItem[]>(() => {
    return categories.map((cat, index) => ({
      id: cat.id ?? cat.name,
      label: cat.name,
      colorName: resolveColorName(cat.colorName, index),
      value: formatDurationMinutes(cat.minutes, locale),
    }));
  }, [categories, locale]);

  const totalMinutes = useMemo<number>(() => {
    return categories.reduce((sum, item) => sum + Math.max(0, item.minutes), 0);
  }, [categories]);

  const centerText = useMemo<string>(() => {
    if (totalMinutes === 0) {
      return "0 min";
    }
    return formatDurationMinutes(totalMinutes, locale);
  }, [totalMinutes, locale]);

  const dataTable = useMemo(() => {
    if (categories.length === 0) {
      return null;
    }

    return (
      <div className="time-category-breakdown__table-wrapper">
        <table className="time-category-breakdown__table">
          <caption>Time allocation table breakdown</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Duration</th>
              <th scope="col">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const pct = totalMinutes > 0 ? Math.round((cat.minutes / totalMinutes) * 100) : 0;
              return (
                <tr key={cat.id ?? cat.name}>
                  <th scope="row">{cat.name}</th>
                  <td>{formatDurationMinutes(cat.minutes, locale)}</td>
                  <td>{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, [categories, totalMinutes, locale]);

  return (
    <div className={`time-category-breakdown ${className}`.trim()}>
      <ChartFrame
        title={title}
        status={status}
        emptyTitle="No time tracked"
        emptyDescription="Schedule or record time blocks to view your category allocation breakdown."
        {...(summary ? { summary } : {})}
        {...(onRetry ? { onRetry } : {})}
        legend={legendItems}
        {...(dataTable ? { dataTable } : {})}
      >
        <DonutChart
          data={chartData}
          label={title}
          locale={locale}
          centerText={centerText}
          valueFormatter={(val) => formatDurationMinutes(val, locale)}
        />
      </ChartFrame>
    </div>
  );
}
