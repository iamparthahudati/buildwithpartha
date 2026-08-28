import { Brain, Coffee, Clock3, Heart, type LucideIcon } from "lucide-react";
import { MetricCard, type MetricCardStatus } from "@components/navigation";
import { formatDurationMinutes } from "@lib/duration";
import "./time-summary-metrics.css";

export interface TimeSummaryCounts {
  readonly focusMinutes: number;
  readonly breakMinutes: number;
  readonly personalMinutes: number;
  readonly unscheduledMinutes: number;
}

export type TimeSummaryMetricsStatus =
  | { readonly type: "ready"; readonly counts: TimeSummaryCounts }
  | { readonly type: "loading" }
  | { readonly type: "empty" }
  | { readonly type: "error"; readonly message: string; readonly onRetry?: () => void };

export interface TimeSummaryMetricsProps {
  readonly status: TimeSummaryMetricsStatus;
  readonly locale?: string;
  readonly className?: string;
}

interface MetricSpec {
  readonly key: keyof TimeSummaryCounts;
  readonly label: string;
  readonly icon: LucideIcon;
}

const METRICS: readonly MetricSpec[] = [
  { key: "focusMinutes", label: "Focus time", icon: Brain },
  { key: "breakMinutes", label: "Break time", icon: Coffee },
  { key: "personalMinutes", label: "Personal time", icon: Heart },
  { key: "unscheduledMinutes", label: "Unscheduled time", icon: Clock3 },
];

function getMetricCardStatus(
  status: TimeSummaryMetricsStatus,
  key: keyof TimeSummaryCounts,
  locale: string = "en-US",
): MetricCardStatus {
  switch (status.type) {
    case "ready":
      return {
        type: "ready",
        value: formatDurationMinutes(status.counts[key], locale),
      };
    case "loading":
      return { type: "loading" };
    case "empty":
      return { type: "ready", value: "0 min" };
    case "error":
      return {
        type: "error",
        message: status.message,
        ...(status.onRetry ? { onRetry: status.onRetry } : {}),
      };
  }
}

export function TimeSummaryMetrics({
  status,
  locale = "en-US",
  className = "",
}: TimeSummaryMetricsProps) {
  return (
    <div
      className={`time-summary-metrics ${className}`.trim()}
      role="region"
      aria-label="Time summary metrics"
    >
      <div className="time-summary-metrics__grid">
        {METRICS.map((spec) => (
          <MetricCard
            key={spec.key}
            icon={spec.icon}
            label={spec.label}
            status={getMetricCardStatus(status, spec.key, locale)}
          />
        ))}
      </div>
    </div>
  );
}
