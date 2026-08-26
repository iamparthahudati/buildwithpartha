import {
  ChartFrame,
  DonutChart,
  DataTable,
  type ChartDatum,
  type ChartLegendItem,
} from "@components/navigation";
import type { ColorSwatchName } from "@components/forms";
import type { ProgressReport } from "../model/progress";
import "./progress-category-breakdown.css";

export interface ProgressCategoryBreakdownProps {
  readonly report?: ProgressReport;
  readonly loading?: boolean;
  readonly error?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

const COLOR_SERIES: readonly ColorSwatchName[] = [
  "blue",
  "green",
  "amber",
  "purple",
  "teal",
  "red",
  "magenta",
  "olive",
];

interface CategoryTableRow {
  id: string;
  category: string;
  minutes: string;
  percentage: string;
}

export function ProgressCategoryBreakdown({
  report,
  loading = false,
  error,
  onRetry,
  className,
}: ProgressCategoryBreakdownProps) {
  const status = loading ? "loading" : error ? "error" : !report ? "empty" : "ready";

  const categories = report?.focusProgress.categoryBreakdown ?? [];
  const chartData: ChartDatum[] = categories.map((cat, idx) => {
    const colorName: ColorSwatchName = COLOR_SERIES[idx % COLOR_SERIES.length] ?? "blue";
    return {
      id: `cat-${idx}-${cat.category}`,
      label: cat.category,
      value: cat.actualMinutes,
      colorName,
    };
  });

  const legend: ChartLegendItem[] = chartData.map((item) => ({
    id: item.id,
    label: item.label,
    colorName: item.colorName ?? "blue",
  }));

  const tableData: CategoryTableRow[] = categories.map((cat) => ({
    id: cat.category,
    category: cat.category,
    minutes: `${cat.actualMinutes} min`,
    percentage: cat.percentage !== null ? `${Math.round(cat.percentage)}%` : "0%",
  }));

  const dataTable = (
    <DataTable<CategoryTableRow>
      label="Category breakdown table alternative"
      columns={[
        { key: "category", header: "Category", render: (row) => row.category },
        { key: "minutes", header: "Focus Time", render: (row) => row.minutes },
        { key: "percentage", header: "Share (%)", render: (row) => row.percentage },
      ]}
      rows={tableData}
      getRowId={(row) => row.id}
      emptyTitle="No categories recorded"
    />
  );

  return (
    <ChartFrame
      title="Focus Time Category Breakdown"
      summary="Distribution of completed focus session minutes across categories."
      status={status}
      {...(error ? { errorDescription: error } : {})}
      {...(onRetry ? { onRetry } : {})}
      legend={legend}
      dataTable={dataTable}
      className={["progress-category-breakdown", className].filter(Boolean).join(" ")}
    >
      <DonutChart
        data={chartData}
        label="Focus Time Category Breakdown"
        locale="en-US"
        valueFormatter={(val) => `${val} min`}
      />
    </ChartFrame>
  );
}
