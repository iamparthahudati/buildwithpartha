import {
  ChartFrame,
  BarChart,
  DonutChart,
  DataTable,
  type ChartDatum,
  type ChartLegendItem,
} from "@components/navigation";
import { COLOR_SWATCHES, type ColorSwatchName } from "@components/forms";
import type { ReportChartSeries } from "../model/reports";
import "./report-chart.css";

export interface ReportChartProps {
  readonly chartSeries: readonly ReportChartSeries[];
  readonly loading?: boolean | undefined;
  readonly error?: string | null | undefined;
  readonly onRetry?: (() => void) | undefined;
}

const COLOR_SERIES: readonly ColorSwatchName[] = COLOR_SWATCHES.map((s) => s.name);

interface ChartTableRow {
  id: string;
  label: string;
  value: string;
  category: string;
  date: string;
}

export function ReportChart({
  chartSeries,
  loading = false,
  error = null,
  onRetry,
}: ReportChartProps) {
  if (loading) {
    return (
      <div className="report-chart" data-testid="report-chart-skeleton">
        <ChartFrame title="Loading Chart..." status="loading">
          <div className="report-chart__skeleton-body" />
        </ChartFrame>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-chart" data-testid="report-chart-error">
        <ChartFrame
          title="Report Visualization"
          status="error"
          errorDescription={error}
          {...(onRetry ? { onRetry } : {})}
        >
          <div />
        </ChartFrame>
      </div>
    );
  }

  if (!chartSeries || chartSeries.length === 0) {
    return null;
  }

  return (
    <div className="report-chart" data-testid="report-chart">
      {chartSeries.map((series, seriesIdx) => {
        const chartData: ChartDatum[] = series.dataPoints.map((dp, dpIdx) => {
          const colorName: ColorSwatchName = COLOR_SERIES[dpIdx % COLOR_SERIES.length] ?? "blue";
          return {
            id: `dp-${seriesIdx}-${dpIdx}`,
            label: dp.label || dp.date || dp.category || `Point ${dpIdx + 1}`,
            value: dp.value ?? 0,
            colorName,
          };
        });

        const legend: ChartLegendItem[] = chartData.map((cd, idx) => ({
          id: `leg-${seriesIdx}-${idx}`,
          label: cd.label,
          colorName: cd.colorName ?? COLOR_SERIES[idx % COLOR_SERIES.length] ?? "blue",
        }));

        const tableRows: ChartTableRow[] = series.dataPoints.map((dp, dpIdx) => ({
          id: `row-${seriesIdx}-${dpIdx}`,
          label: dp.label || "-",
          value: dp.value !== null ? dp.value.toLocaleString() : "0",
          category: dp.category || "-",
          date: dp.date || "-",
        }));

        const dataTable = (
          <DataTable<ChartTableRow>
            label={`${series.title} table alternative`}
            columns={[
              { key: "label", header: "Data Label", render: (r) => r.label },
              { key: "value", header: "Value", render: (r) => r.value },
              { key: "category", header: "Category", render: (r) => r.category },
              { key: "date", header: "Date", render: (r) => r.date },
            ]}
            rows={tableRows}
            getRowId={(r) => r.id}
            emptyTitle="No chart data recorded"
          />
        );

        const isDonutOrPie = series.chartType === "DONUT" || series.chartType === "PIE";

        return (
          <ChartFrame
            key={series.chartId || `chart-${seriesIdx}`}
            title={series.title}
            status="ready"
            legend={legend}
            dataTable={dataTable}
            className="report-chart__frame"
          >
            {isDonutOrPie ? (
              <DonutChart
                data={chartData}
                label={series.title}
                locale="en-US"
                valueFormatter={(v) => v.toLocaleString()}
              />
            ) : (
              <BarChart
                data={chartData}
                label={series.title}
                locale="en-US"
                valueFormatter={(v) => v.toLocaleString()}
              />
            )}
          </ChartFrame>
        );
      })}
    </div>
  );
}
