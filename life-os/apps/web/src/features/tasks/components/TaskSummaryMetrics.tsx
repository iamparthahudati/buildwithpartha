import {
  CheckCircle2,
  CircleAlert,
  CircleDot,
  ListTodo,
  PauseCircle,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";

import { MetricCard, type MetricCardStatus } from "@components/navigation";
import { Button, VisuallyHidden } from "@components/ui";

import { TASK_FILTER_PRESETS, type TaskFilterPresetId } from "../model/taskFilterPresets";
import "./task-summary-metrics.css";

export interface TaskSummaryCounts {
  readonly total: number;
  readonly toDo: number;
  readonly inProgress: number;
  readonly done: number;
  readonly blocked: number;
  readonly overdue: number;
}

export type TaskSummaryMetricsStatus =
  | { readonly type: "ready"; readonly counts: TaskSummaryCounts }
  | { readonly type: "loading" }
  | { readonly type: "empty" }
  | { readonly type: "error"; readonly message: string; readonly onRetry?: () => void };

export interface TaskSummaryMetricsProps {
  readonly status: TaskSummaryMetricsStatus;
  readonly activePreset?: TaskFilterPresetId | null;
  readonly onSelectPreset?: (preset: TaskFilterPresetId) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

interface TaskMetricSpec {
  readonly preset: TaskFilterPresetId;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly countKey: keyof TaskSummaryCounts;
  readonly actionName: string;
}

const ICON_BY_PRESET: Readonly<Record<TaskFilterPresetId, LucideIcon>> = {
  ALL: ListTodo,
  TO_DO: CircleDot,
  IN_PROGRESS: PlayCircle,
  DONE: CheckCircle2,
  BLOCKED: PauseCircle,
  OVERDUE: CircleAlert,
};

const COUNT_KEY_BY_PRESET: Readonly<Record<TaskFilterPresetId, keyof TaskSummaryCounts>> = {
  ALL: "total",
  TO_DO: "toDo",
  IN_PROGRESS: "inProgress",
  DONE: "done",
  BLOCKED: "blocked",
  OVERDUE: "overdue",
};

const METRICS: readonly TaskMetricSpec[] = TASK_FILTER_PRESETS.map((preset) => ({
  preset: preset.id,
  label: preset.label,
  icon: ICON_BY_PRESET[preset.id],
  countKey: COUNT_KEY_BY_PRESET[preset.id],
  actionName: preset.id === "ALL" ? "Show all tasks" : `Show ${preset.label} tasks`,
}));

function metricStatus(
  status: TaskSummaryMetricsStatus,
  countKey: keyof TaskSummaryCounts,
  includeRetry: boolean,
): MetricCardStatus {
  switch (status.type) {
    case "ready":
      return { type: "ready", value: String(status.counts[countKey]) };
    case "loading":
      return { type: "loading" };
    case "empty":
      return { type: "ready", value: "0" };
    case "error":
      return {
        type: "error",
        message: status.message,
        ...(includeRetry && status.onRetry ? { onRetry: status.onRetry } : {}),
      };
  }
}

function statusAnnouncement(status: TaskSummaryMetricsStatus): string {
  switch (status.type) {
    case "ready":
      return METRICS.map((metric) => `${metric.label}: ${status.counts[metric.countKey]}`).join(
        ". ",
      );
    case "loading":
      return "Loading task counts…";
    case "empty":
      return "No tasks yet.";
    case "error":
      return status.message;
  }
}

/**
 * Six actionable Task summary metrics (LOS-0811).
 *
 * Counts are one controlled summary state because the backend returns them in
 * one response. Preset selection is controlled separately so a stale or
 * temporarily unavailable count never erases the caller's URL-backed filter.
 */
export function TaskSummaryMetrics({
  status,
  activePreset = "ALL",
  onSelectPreset,
  disabled = false,
  className,
}: TaskSummaryMetricsProps) {
  return (
    <section
      className={["lifeos-task-summary-metrics", className].filter(Boolean).join(" ")}
      aria-label="Task summary"
      aria-busy={status.type === "loading" || undefined}
    >
      <VisuallyHidden>
        <span role="status" aria-live="polite" aria-atomic="true">
          {statusAnnouncement(status)}
        </span>
      </VisuallyHidden>

      {METRICS.map((metric, index) => {
        const active = activePreset === metric.preset;

        return (
          <div
            key={metric.preset}
            className={[
              "lifeos-task-summary-metrics__item",
              active && "lifeos-task-summary-metrics__item--active",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <MetricCard
              icon={metric.icon}
              label={metric.label}
              status={metricStatus(status, metric.countKey, index === 0)}
              action={
                onSelectPreset ? (
                  <Button
                    type="button"
                    variant={active ? "primary" : "ghost"}
                    size="sm"
                    aria-label={metric.actionName}
                    aria-pressed={active}
                    disabled={disabled}
                    onClick={() => onSelectPreset(metric.preset)}
                  >
                    {active ? "Showing" : "Show tasks"}
                  </Button>
                ) : undefined
              }
            />
          </div>
        );
      })}
    </section>
  );
}
