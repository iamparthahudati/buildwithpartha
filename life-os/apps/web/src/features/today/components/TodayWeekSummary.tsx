import { useId } from "react";
import { CalendarRange } from "lucide-react";

import { ErrorState } from "@components/feedback";
import { Heading, Icon, Link, ProgressBar, Skeleton, Text, VisuallyHidden } from "@components/ui";
import { formatDurationMinutes } from "@lib/duration";
import { formatLocalDate } from "@lib/localDateTime";

import type { TodayWeekState } from "../model/todaySprintWeek";
import { WeeklyDayStrip } from "./WeeklyDayStrip";

export interface TodayWeekSummaryProps {
  readonly state: TodayWeekState;
  readonly locale: string;
  readonly weekPlannerHref?: string;
  readonly onRetry?: () => void;
}

export function TodayWeekSummary({
  state,
  locale,
  weekPlannerHref = "/life-os/app/week-planner",
  onRetry,
}: TodayWeekSummaryProps) {
  const headingId = useId();

  return (
    <div className="lifeos-sprint-week-summary__panel" role="region" aria-labelledby={headingId}>
      <Heading level={3} size="sm" id={headingId}>
        This week
      </Heading>

      {state.type === "loading" ? <WeekLoading /> : null}

      {state.type === "empty" ? (
        <div className="lifeos-sprint-week-summary__empty">
          <Icon icon={CalendarRange} decorative />
          <Text weight="semibold">No Weekly Plan yet</Text>
          <Text size="sm" tone="secondary">
            Plan this week when you want to compare commitments with capacity.
          </Text>
          <Link href={weekPlannerHref}>Open Week Planner</Link>
        </div>
      ) : null}

      {state.type === "error" ? (
        <ErrorState
          scope="region"
          title="This week's plan couldn't load."
          description={state.message}
          {...(onRetry ? { onRetry } : {})}
          action={<Link href={weekPlannerHref}>Open Week Planner</Link>}
        />
      ) : null}

      {state.type === "ready" ? (
        <WeekReady state={state} locale={locale} weekPlannerHref={weekPlannerHref} />
      ) : null}
    </div>
  );
}

function WeekLoading() {
  return (
    <div
      className="lifeos-sprint-week-summary__week-loading"
      role="status"
      aria-label="Loading this week's plan"
      aria-busy="true"
    >
      <VisuallyHidden>Loading this week's plan.</VisuallyHidden>
      <span className="lifeos-sprint-week-summary__day-skeletons" aria-hidden="true">
        {Array.from({ length: 7 }, (_unused, index) => (
          <Skeleton key={index} shape="block" height="5rem" />
        ))}
      </span>
      <Skeleton width="80%" />
      <Skeleton width="70%" />
    </div>
  );
}

function WeekReady({
  state,
  locale,
  weekPlannerHref,
}: {
  readonly state: Extract<TodayWeekState, { readonly type: "ready" }>;
  readonly locale: string;
  readonly weekPlannerHref: string;
}) {
  const { week } = state;
  const formatter = new Intl.NumberFormat(locale);
  const completedGoals = week.goals.filter((goal) => goal.completed).length;
  const totalGoals = week.goals.length;
  const plannedMinutes = Math.max(0, week.plannedMinutes);
  const capacityMinutes = Math.max(0, week.capacityMinutes);
  const overCapacity = capacityMinutes > 0 && plannedMinutes > capacityMinutes;
  const weekRange = `${formatLocalDate(week.startDate, locale)} – ${formatLocalDate(week.endDate, locale)}`;

  return (
    <div className="lifeos-sprint-week-summary__week-ready">
      <Text size="xs" tone="secondary" numeric>
        {weekRange}
      </Text>

      <WeeklyDayStrip days={week.days} locale={locale} />

      <div className="lifeos-sprint-week-summary__measures">
        {totalGoals > 0 ? (
          <ProgressBar
            label="Weekly goals"
            value={completedGoals}
            max={totalGoals}
            valueText={`${formatter.format(completedGoals)} of ${formatter.format(totalGoals)} weekly goals completed`}
            showValue
            size="sm"
          />
        ) : (
          <div className="lifeos-sprint-week-summary__measure-empty">
            <Text size="xs" weight="medium">
              Weekly goals
            </Text>
            <Text size="xs" tone="secondary">
              No goals linked to this week.
            </Text>
          </div>
        )}

        {capacityMinutes > 0 ? (
          <ProgressBar
            label="Weekly capacity"
            value={plannedMinutes}
            max={capacityMinutes}
            valueText={`${formatDurationMinutes(plannedMinutes, locale, "long")} planned of ${formatDurationMinutes(capacityMinutes, locale, "long")} capacity${overCapacity ? "; over capacity" : ""}`}
            showValue
            tone={overCapacity ? "warning" : "primary"}
            size="sm"
          />
        ) : (
          <div className="lifeos-sprint-week-summary__measure-empty">
            <Text size="xs" weight="medium">
              Weekly capacity
            </Text>
            <Text size="xs" tone="secondary">
              No weekly capacity set.
            </Text>
          </div>
        )}
      </div>

      {overCapacity ? (
        <Text size="sm" tone="secondary">
          Planned time is above the capacity set for this week.
        </Text>
      ) : null}

      <Link href={weekPlannerHref}>Open Week Planner</Link>
    </div>
  );
}
