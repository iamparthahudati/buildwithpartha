import { BookOpen, CheckCircle2, Clock, FolderKanban, Star, type LucideIcon } from "lucide-react";

import { MetricCard, type MetricCardStatus } from "@components/navigation";

import "./today-metric-strip.css";

/**
 * TodayMetricStrip (LOS-0608).
 *
 * Up to six at-a-glance metric cards for the Today dashboard, composing the
 * shared `MetricCard` (LOS-0419) per the metric strip specification in
 * `26-TODAY-INFORMATION-PRIORITY.md`.
 *
 * Default order (§ "Metric strip"):
 *   1. Today's focus / MIT state
 *   2. Tasks planned today
 *   3. Scheduled time
 *   4. Focus time actual vs. planned/target
 *   5. Active projects needing attention
 *   6. Current week completion / capacity
 *
 * Each metric is independently controlled by the caller — a `MetricCardStatus`
 * discriminated union that maps to `ready`, `loading`, `error` (with optional
 * retry), or `empty`. A widget failure cannot affect the others.
 *
 * "Metrics with no meaningful denominator show an absolute value or setup
 * action, never `0%` as a negative judgment." — `26-TODAY-INFORMATION-PRIORITY.md`
 *
 * On desktop the strip fills its container across all six columns using a
 * CSS `repeat(auto-fit, minmax(…))` grid. On mobile it becomes a horizontally
 * scrollable row, each card remaining keyboard/touch accessible (overflow-x
 * scroll does not disable tab stops). On very narrow viewports where scroll is
 * inappropriate the grid wraps to a two-column arrangement automatically.
 */

export interface TodayMetricsData {
  /** Today's focus / MIT status. */
  readonly mitStatus: MetricCardStatus;
  /** Tasks explicitly planned or due today. */
  readonly tasksStatus: MetricCardStatus;
  /** Total scheduled time in today's time blocks. */
  readonly scheduledTimeStatus: MetricCardStatus;
  /** Actual focus time vs. optional planned/target. */
  readonly focusTimeStatus: MetricCardStatus;
  /** Active projects needing attention. */
  readonly activeProjectsStatus: MetricCardStatus;
  /** Current week completion vs. capacity. */
  readonly weekProgressStatus: MetricCardStatus;
  /** Fired when the MIT / focus metric's error retry is clicked. */
  readonly onRetryMit?: () => void;
  /** Fired when the tasks metric's error retry is clicked. */
  readonly onRetryTasks?: () => void;
  /** Fired when the scheduled-time metric's error retry is clicked. */
  readonly onRetryScheduledTime?: () => void;
  /** Fired when the focus-time metric's error retry is clicked. */
  readonly onRetryFocusTime?: () => void;
  /** Fired when the active-projects metric's error retry is clicked. */
  readonly onRetryActiveProjects?: () => void;
  /** Fired when the week-progress metric's error retry is clicked. */
  readonly onRetryWeekProgress?: () => void;
}

export interface TodayMetricStripProps extends TodayMetricsData {
  readonly className?: string;
}

interface MetricSpec {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly statusKey: keyof TodayMetricsData;
  readonly retryKey: keyof TodayMetricsData;
}

const METRIC_SPECS: readonly MetricSpec[] = [
  {
    id: "mit",
    icon: Star,
    label: "Today's focus",
    statusKey: "mitStatus",
    retryKey: "onRetryMit",
  },
  {
    id: "tasks",
    icon: CheckCircle2,
    label: "Tasks today",
    statusKey: "tasksStatus",
    retryKey: "onRetryTasks",
  },
  {
    id: "scheduled-time",
    icon: Clock,
    label: "Scheduled time",
    statusKey: "scheduledTimeStatus",
    retryKey: "onRetryScheduledTime",
  },
  {
    id: "focus-time",
    icon: BookOpen,
    label: "Focus time",
    statusKey: "focusTimeStatus",
    retryKey: "onRetryFocusTime",
  },
  {
    id: "active-projects",
    icon: FolderKanban,
    label: "Active projects",
    statusKey: "activeProjectsStatus",
    retryKey: "onRetryActiveProjects",
  },
  {
    id: "week-progress",
    icon: CheckCircle2,
    label: "Week progress",
    statusKey: "weekProgressStatus",
    retryKey: "onRetryWeekProgress",
  },
];

function resolveStatus(raw: MetricCardStatus, onRetry?: () => void): MetricCardStatus {
  // Attach the caller-supplied retry callback to error statuses.
  if (raw.type === "error" && onRetry !== undefined) {
    return { ...raw, onRetry };
  }
  return raw;
}

export function TodayMetricStrip({
  mitStatus,
  tasksStatus,
  scheduledTimeStatus,
  focusTimeStatus,
  activeProjectsStatus,
  weekProgressStatus,
  onRetryMit,
  onRetryTasks,
  onRetryScheduledTime,
  onRetryFocusTime,
  onRetryActiveProjects,
  onRetryWeekProgress,
  className,
}: TodayMetricStripProps) {
  const statusMap: Record<string, MetricCardStatus> = {
    mitStatus,
    tasksStatus,
    scheduledTimeStatus,
    focusTimeStatus,
    activeProjectsStatus,
    weekProgressStatus,
  };

  const retryMap: Record<string, (() => void) | undefined> = {
    onRetryMit,
    onRetryTasks,
    onRetryScheduledTime,
    onRetryFocusTime,
    onRetryActiveProjects,
    onRetryWeekProgress,
  };

  const rootClasses = ["lifeos-today-metric-strip", className].filter(Boolean).join(" ");

  return (
    // The strip becomes an overflow region below 30rem; a tab stop lets keyboard users scroll it.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className={rootClasses} role="region" aria-label="Today at a glance" tabIndex={0}>
      {METRIC_SPECS.map((spec) => (
        <MetricCard
          key={spec.id}
          icon={spec.icon}
          label={spec.label}
          status={resolveStatus(
            statusMap[spec.statusKey] as MetricCardStatus,
            retryMap[spec.retryKey] as (() => void) | undefined,
          )}
        />
      ))}
    </div>
  );
}
