import { MetricCard } from "@components/navigation";
import { ErrorState } from "@components/feedback";
import type { GoalSummaryCounts } from "../model/goal";
import "./goal-metric-summary.css";

export interface GoalMetricSummaryProps {
  readonly counts?: GoalSummaryCounts;
  readonly loading?: boolean;
  readonly error?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export function GoalMetricSummary({
  counts,
  loading = false,
  error,
  onRetry,
  className,
}: GoalMetricSummaryProps) {
  if (loading) {
    return (
      <div
        aria-label="Loading goal metrics"
        className={["goal-metric-summary", className].filter(Boolean).join(" ")}
      >
        <MetricCard label="Total Goals" status={{ type: "loading" }} />
        <MetricCard label="Completed Goals" status={{ type: "loading" }} />
        <MetricCard label="Paused Goals" status={{ type: "loading" }} />
        <MetricCard label="Average Progress" status={{ type: "loading" }} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        scope="region"
        title="Unable to load goal summary"
        description={error}
        {...(onRetry ? { onRetry } : {})}
        {...(className ? { className } : {})}
      />
    );
  }

  const summary = counts ?? {
    totalGoals: 0,
    activeGoals: 0,
    completedGoals: 0,
    pausedGoals: 0,
    archivedGoals: 0,
    averageProgressPercentage: 0,
  };

  return (
    <div
      aria-label="Goal metrics summary"
      className={["goal-metric-summary", className].filter(Boolean).join(" ")}
    >
      <MetricCard
        label="Total Goals"
        status={{ type: "ready", value: summary.totalGoals.toString() }}
        period={`${summary.activeGoals} active`}
      />

      <MetricCard
        label="Completed Goals"
        status={{ type: "ready", value: summary.completedGoals.toString() }}
      />

      <MetricCard
        label="Paused Goals"
        status={{ type: "ready", value: summary.pausedGoals.toString() }}
      />

      <MetricCard
        label="Average Progress"
        status={{
          type: "ready",
          value: `${Math.round(summary.averageProgressPercentage)}%`,
        }}
        {...(summary.archivedGoals > 0 ? { period: `${summary.archivedGoals} archived` } : {})}
      />
    </div>
  );
}
