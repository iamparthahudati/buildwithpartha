import {
  Folder,
  PlayCircle,
  CheckCircle2,
  PauseCircle,
  AlertTriangle,
  BarChart2,
} from "lucide-react";
import { MetricCard, type MetricCardStatus } from "@components/navigation";
import { Button } from "@components/ui";
import "./project-summary-metrics.css";

export interface ProjectSummaryCounts {
  readonly total: number;
  readonly active: number;
  readonly completed: number;
  readonly onHold: number;
  readonly atRisk: number;
  readonly averageProgress: number; // percentage 0..100
}

export type ProjectFilterCategory = "ALL" | "ACTIVE" | "COMPLETED" | "ON_HOLD" | "AT_RISK";

export interface ProjectSummaryMetricsProps {
  readonly counts?: ProjectSummaryCounts | null;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly onRetry?: () => void;
  readonly activeFilter?: ProjectFilterCategory;
  readonly onSelectFilter?: (filter: ProjectFilterCategory) => void;
  readonly className?: string;
}

function formatAverageProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(Math.min(100, Math.max(0, value)));
}

export function ProjectSummaryMetrics({
  counts,
  loading = false,
  error,
  onRetry,
  activeFilter,
  onSelectFilter,
  className,
}: ProjectSummaryMetricsProps) {
  function getStatus(val: number | string | undefined): MetricCardStatus {
    if (loading) {
      return { type: "loading" };
    }
    if (error) {
      return { type: "error", message: error, ...(onRetry ? { onRetry } : {}) };
    }
    if (val === undefined || counts === null) {
      return { type: "empty", message: "—" };
    }
    return { type: "ready", value: String(val) };
  }

  const items = [
    {
      key: "ALL" as const,
      label: "Total projects",
      icon: Folder,
      value: counts?.total,
    },
    {
      key: "ACTIVE" as const,
      label: "Active projects",
      icon: PlayCircle,
      value: counts?.active,
    },
    {
      key: "COMPLETED" as const,
      label: "Completed",
      icon: CheckCircle2,
      value: counts?.completed,
    },
    {
      key: "ON_HOLD" as const,
      label: "On hold",
      icon: PauseCircle,
      value: counts?.onHold,
    },
    {
      key: "AT_RISK" as const,
      label: "At risk / Off track",
      icon: AlertTriangle,
      value: counts?.atRisk,
    },
    {
      key: "PROGRESS" as const,
      label: "Average progress",
      icon: BarChart2,
      value: counts ? `${formatAverageProgress(counts.averageProgress)}%` : undefined,
    },
  ];

  return (
    <div
      className={["lifeos-project-summary-metrics", className].filter(Boolean).join(" ")}
      role="region"
      aria-label="Project summary metrics"
    >
      {items.map((item) => {
        const isFilterable = item.key !== "PROGRESS" && onSelectFilter;
        const isActive = activeFilter === item.key;

        return (
          <div
            key={item.key}
            className={[
              "lifeos-project-summary-metrics__item",
              isActive && "lifeos-project-summary-metrics__item--active",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <MetricCard
              icon={item.icon}
              label={item.label}
              status={getStatus(item.value)}
              action={
                isFilterable ? (
                  <Button
                    type="button"
                    variant={isActive ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => onSelectFilter(item.key as ProjectFilterCategory)}
                  >
                    {isActive ? "Filtered" : "Filter"}
                  </Button>
                ) : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}
