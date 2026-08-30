import { CalendarCheck, Flame, Target, TrendingUp } from "lucide-react";

import { ErrorState } from "@components/feedback";
import { MetricCard } from "@components/navigation";
import { LiveRegion } from "@components/ui";

import { formatHabitRate, type HabitStreakStatistics } from "../model/habit";
import "./habit-streak-summary.css";

export type HabitStreakSummaryStatus =
  | { readonly type: "ready"; readonly statistics: HabitStreakStatistics }
  | { readonly type: "loading" }
  | { readonly type: "empty" }
  | { readonly type: "error"; readonly message: string; readonly onRetry?: () => void };

export interface HabitStreakSummaryProps {
  readonly status: HabitStreakSummaryStatus;
  readonly cadenceLabel?: string;
  readonly locale?: string;
  readonly className?: string;
}

export function HabitStreakSummary({
  status,
  cadenceLabel = "eligible periods",
  locale = "en-US",
  className,
}: HabitStreakSummaryProps) {
  if (status.type === "error") {
    return (
      <ErrorState
        scope="region"
        title="Habit statistics couldn't load"
        description={status.message}
        {...(status.onRetry ? { onRetry: status.onRetry } : {})}
        {...(className ? { className } : {})}
      />
    );
  }

  const statistics = status.type === "ready" ? status.statistics : undefined;
  const metricStatus = (value: string) =>
    status.type === "loading"
      ? ({ type: "loading" } as const)
      : status.type === "empty"
        ? ({ type: "empty", message: "No history yet" } as const)
        : ({ type: "ready", value } as const);

  return (
    <section
      aria-label="Habit streak and consistency"
      className={["habit-streak-summary", className].filter(Boolean).join(" ")}
    >
      {status.type === "loading" ? <LiveRegion message="Loading Habit statistics…" /> : null}
      <MetricCard
        icon={Flame}
        label="Current streak"
        status={metricStatus(String(statistics?.currentStreak ?? 0))}
        {...(status.type === "ready" ? { period: cadenceLabel } : {})}
      />
      <MetricCard
        icon={TrendingUp}
        label="Longest streak"
        status={metricStatus(String(statistics?.longestStreak ?? 0))}
        {...(status.type === "ready" ? { period: cadenceLabel } : {})}
      />
      <MetricCard
        icon={Target}
        label="Completion rate"
        status={metricStatus(formatHabitRate(statistics?.completionRate ?? 0, locale))}
        {...(status.type === "ready"
          ? {
              period: `${statistics?.metTargetPeriods ?? 0} of ${statistics?.eligiblePeriods ?? 0} ${cadenceLabel}`,
            }
          : {})}
      />
      <MetricCard
        icon={CalendarCheck}
        label="Periods counted"
        status={metricStatus(String(statistics?.eligiblePeriods ?? 0))}
        {...(status.type === "ready" ? { period: "Paused periods excluded" } : {})}
      />
    </section>
  );
}
