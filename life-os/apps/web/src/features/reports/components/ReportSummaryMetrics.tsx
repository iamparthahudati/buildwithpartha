import { MetricCard } from "@components/navigation";
import type { ReportMetricItem } from "../model/reports";
import "./report-summary-metrics.css";

export interface ReportSummaryMetricsProps {
  readonly metrics: readonly ReportMetricItem[];
  readonly loading?: boolean | undefined;
}

export function ReportSummaryMetrics({ metrics, loading = false }: ReportSummaryMetricsProps) {
  if (loading) {
    return (
      <div className="report-summary-metrics" data-testid="report-summary-metrics-skeleton">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="report-summary-metrics__skeleton-card" />
        ))}
      </div>
    );
  }

  if (!metrics || metrics.length === 0) {
    return null;
  }

  return (
    <div className="report-summary-metrics" data-testid="report-summary-metrics">
      {metrics.map((metric) => {
        const displayValue = metric.unit ? `${metric.value} ${metric.unit}` : metric.value;
        return (
          <MetricCard
            key={metric.key}
            label={metric.name}
            status={{ type: "ready", value: displayValue }}
            {...(metric.comparisonValue ? { period: metric.comparisonValue } : {})}
          />
        );
      })}
    </div>
  );
}
