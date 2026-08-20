import { Surface } from "@components/ui";

import type { TodaySprintState, TodayWeekState } from "../model/todaySprintWeek";
import { TodaySprintSummary } from "./TodaySprintSummary";
import { TodayWeekSummary } from "./TodayWeekSummary";
import "./sprint-week-summary.css";

export interface SprintWeekSummaryProps {
  readonly sprintState: TodaySprintState;
  readonly weekState: TodayWeekState;
  readonly locale: string;
  readonly sprintsHref?: string;
  readonly weekPlannerHref?: string;
  readonly onRetrySprint?: () => void;
  readonly onRetryWeek?: () => void;
  readonly className?: string;
}

/** Current Sprint and Weekly Plan context for the Today dashboard (LOS-0611). */
export function SprintWeekSummary({
  sprintState,
  weekState,
  locale,
  sprintsHref,
  weekPlannerHref,
  onRetrySprint,
  onRetryWeek,
  className,
}: SprintWeekSummaryProps) {
  return (
    <Surface
      as="section"
      title="Sprint and week"
      titleLevel={2}
      padding="lg"
      className={["lifeos-sprint-week-summary", className].filter(Boolean).join(" ")}
    >
      <div className="lifeos-sprint-week-summary__layout">
        <TodaySprintSummary
          state={sprintState}
          locale={locale}
          {...(sprintsHref ? { sprintsHref } : {})}
          {...(onRetrySprint ? { onRetry: onRetrySprint } : {})}
        />
        <TodayWeekSummary
          state={weekState}
          locale={locale}
          {...(weekPlannerHref ? { weekPlannerHref } : {})}
          {...(onRetryWeek ? { onRetry: onRetryWeek } : {})}
        />
      </div>
    </Surface>
  );
}
