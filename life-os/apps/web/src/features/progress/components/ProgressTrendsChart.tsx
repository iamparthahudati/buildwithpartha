import {
  ChartFrame,
  BarChart,
  DataTable,
  type ChartDatum,
  type ChartLegendItem,
} from "@components/navigation";
import type { ProgressReport } from "../model/progress";
import "./progress-trends-chart.css";

export interface ProgressTrendsChartProps {
  readonly report?: ProgressReport;
  readonly loading?: boolean;
  readonly error?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

interface TrendTableRow {
  id: string;
  metric: string;
  value: string;
}

export function ProgressTrendsChart({
  report,
  loading = false,
  error,
  onRetry,
  className,
}: ProgressTrendsChartProps) {
  const status = loading ? "loading" : error ? "error" : !report ? "empty" : "ready";

  const chartData: ChartDatum[] = report
    ? [
        {
          id: "planned-focus",
          label: "Planned Focus (min)",
          value: report.focusProgress.plannedFocusMinutes,
          colorName: "blue",
        },
        {
          id: "actual-focus",
          label: "Actual Focus (min)",
          value: report.focusProgress.actualFocusMinutes,
          colorName: "green",
        },
        {
          id: "actual-break",
          label: "Break Time (min)",
          value: report.focusProgress.actualBreakMinutes,
          colorName: "teal",
        },
        {
          id: "tasks-completed",
          label: "Completed Tasks",
          value: report.taskProgress.completedCount,
          colorName: "purple",
        },
      ]
    : [];

  const legend: ChartLegendItem[] = [
    { id: "leg-1", label: "Planned Focus (min)", colorName: "blue" },
    { id: "leg-2", label: "Actual Focus (min)", colorName: "green" },
    { id: "leg-3", label: "Break Time (min)", colorName: "teal" },
    { id: "leg-4", label: "Completed Tasks", colorName: "purple" },
  ];

  const tableData: TrendTableRow[] = chartData.map((item) => ({
    id: item.id,
    metric: item.label,
    value: item.value.toLocaleString(),
  }));

  const dataTable = (
    <DataTable<TrendTableRow>
      label="Progress trends table alternative"
      columns={[
        { key: "metric", header: "Metric", render: (row) => row.metric },
        { key: "value", header: "Recorded Value", render: (row) => row.value },
      ]}
      rows={tableData}
      getRowId={(row) => row.id}
      emptyTitle="No trend data recorded"
    />
  );

  return (
    <ChartFrame
      title="Focus & Task Execution Trends"
      summary="Comparison of planned vs actual focus time, break duration, and completed tasks."
      status={status}
      {...(error ? { errorDescription: error } : {})}
      {...(onRetry ? { onRetry } : {})}
      legend={legend}
      dataTable={dataTable}
      className={["progress-trends-chart", className].filter(Boolean).join(" ")}
    >
      <BarChart
        data={chartData}
        label="Focus & Task Execution Trends"
        locale="en-US"
        valueFormatter={(val) => `${val}`}
      />
    </ChartFrame>
  );
}
