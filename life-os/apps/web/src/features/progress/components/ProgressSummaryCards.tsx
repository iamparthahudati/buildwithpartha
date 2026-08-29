import { MetricCard } from "@components/navigation";
import { ErrorState } from "@components/feedback";
import type { ProgressReport } from "../model/progress";
import "./progress-summary-cards.css";

export interface ProgressSummaryCardsProps {
  readonly report?: ProgressReport;
  readonly loading?: boolean;
  readonly error?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export function ProgressSummaryCards({
  report,
  loading = false,
  error,
  onRetry,
  className,
}: ProgressSummaryCardsProps) {
  if (loading) {
    return (
      <div
        aria-label="Loading progress summary metrics"
        className={["progress-summary-cards", className].filter(Boolean).join(" ")}
      >
        <MetricCard label="Task Completion" status={{ type: "loading" }} />
        <MetricCard label="Focus Time" status={{ type: "loading" }} />
        <MetricCard label="Project Progress" status={{ type: "loading" }} />
        <MetricCard label="Goal Progress" status={{ type: "loading" }} />
        <MetricCard label="Habit Completion" status={{ type: "loading" }} />
        <MetricCard label="Review Streak" status={{ type: "loading" }} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        scope="region"
        title="Unable to load progress metrics"
        description={error}
        {...(onRetry ? { onRetry } : {})}
        {...(className ? { className } : {})}
      />
    );
  }

  const tasks = report?.taskProgress;
  const focus = report?.focusProgress;
  const projects = report?.projectProgress;
  const goals = report?.goalProgress;
  const habits = report?.habitProgress;
  const reviews = report?.reviewProgress;

  const taskPct =
    tasks?.completionRatePercentage !== null && tasks?.completionRatePercentage !== undefined
      ? `${Math.round(tasks.completionRatePercentage)}%`
      : "0%";
  const taskSubtitle = tasks
    ? `${tasks.completedCount} of ${tasks.totalCount} completed`
    : undefined;

  const focusActual = focus ? `${focus.actualFocusMinutes} min` : "0 min";
  const focusSubtitle = focus
    ? focus.plannedVsActualRatio !== null
      ? `${Math.round(focus.plannedVsActualRatio)}% of ${
          focus.comparisonSource === "PLANNED_BLOCKS" ? "planned" : "target"
        } (${focus.comparisonMinutes || 0} min)`
      : `${focus.actualBreakMinutes} min break time`
    : undefined;

  const projectPct =
    projects?.averageProgressPercentage !== null &&
    projects?.averageProgressPercentage !== undefined
      ? `${Math.round(projects.averageProgressPercentage)}%`
      : "0%";
  const projectSubtitle = projects ? `${projects.totalCount} total projects` : undefined;

  const goalPct =
    goals?.averageProgressPercentage !== null && goals?.averageProgressPercentage !== undefined
      ? `${Math.round(goals.averageProgressPercentage)}%`
      : "0%";
  const goalSubtitle = goals
    ? `${goals.goalsWithRecentCheckinCount} with recent check-in`
    : undefined;

  const habitPct =
    habits?.completionRatePercentage !== null && habits?.completionRatePercentage !== undefined
      ? `${Math.round(habits.completionRatePercentage)}%`
      : "0%";
  const habitSubtitle = habits ? `${habits.totalCount} active habits` : undefined;

  const reviewStreak = reviews ? `${reviews.dailyStreakDays} days` : "0 days";
  const reviewSubtitle = reviews ? `${reviews.finalizedReviewsCount} finalized reviews` : undefined;

  return (
    <div
      aria-label="Progress summary metrics"
      className={["progress-summary-cards", className].filter(Boolean).join(" ")}
    >
      <MetricCard
        label="Task Completion"
        status={{ type: "ready", value: taskPct }}
        {...(taskSubtitle ? { period: taskSubtitle } : {})}
      />

      <MetricCard
        label="Focus Time"
        status={{ type: "ready", value: focusActual }}
        {...(focusSubtitle ? { period: focusSubtitle } : {})}
      />

      <MetricCard
        label="Project Progress"
        status={{ type: "ready", value: projectPct }}
        {...(projectSubtitle ? { period: projectSubtitle } : {})}
      />

      <MetricCard
        label="Goal Progress"
        status={{ type: "ready", value: goalPct }}
        {...(goalSubtitle ? { period: goalSubtitle } : {})}
      />

      <MetricCard
        label="Habit Completion"
        status={{ type: "ready", value: habitPct }}
        {...(habitSubtitle ? { period: habitSubtitle } : {})}
      />

      <MetricCard
        label="Review Streak"
        status={{ type: "ready", value: reviewStreak }}
        {...(reviewSubtitle ? { period: reviewSubtitle } : {})}
      />
    </div>
  );
}
