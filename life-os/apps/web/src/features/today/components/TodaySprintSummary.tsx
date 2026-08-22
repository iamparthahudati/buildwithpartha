import { useId } from "react";
import { Gauge } from "lucide-react";

import { ErrorState } from "@components/feedback";
import { DonutChart } from "@components/navigation";
import { Heading, Icon, Link, Skeleton, Text, VisuallyHidden } from "@components/ui";
import { formatLocalDate } from "@lib/localDateTime";

import type { TodaySprintState } from "../model/todaySprintWeek";

export interface TodaySprintSummaryProps {
  readonly state: TodaySprintState;
  readonly locale: string;
  readonly sprintsHref?: string;
  readonly onRetry?: () => void;
}

export function TodaySprintSummary({
  state,
  locale,
  sprintsHref = "/life-os/app/sprints",
  onRetry,
}: TodaySprintSummaryProps) {
  const headingId = useId();

  return (
    <div className="lifeos-sprint-week-summary__panel" role="region" aria-labelledby={headingId}>
      <Heading level={3} size="sm" id={headingId}>
        Current sprint
      </Heading>

      {state.type === "loading" ? <SprintLoading /> : null}

      {state.type === "empty" ? (
        <div className="lifeos-sprint-week-summary__empty">
          <Icon icon={Gauge} decorative />
          <Text weight="semibold">No active sprint</Text>
          <Text size="sm" tone="secondary">
            Plan a sprint when a bounded commitment window would help.
          </Text>
          <Link href={sprintsHref}>Open Sprints</Link>
        </div>
      ) : null}

      {state.type === "error" ? (
        <ErrorState
          scope="region"
          title="Current sprint couldn't load."
          description={state.message}
          {...(onRetry ? { onRetry } : {})}
          action={<Link href={sprintsHref}>Open Sprints</Link>}
        />
      ) : null}

      {state.type === "ready" ? (
        <SprintReady state={state} locale={locale} sprintsHref={sprintsHref} />
      ) : null}
    </div>
  );
}

function SprintLoading() {
  return (
    <div
      className="lifeos-sprint-week-summary__loading"
      role="status"
      aria-label="Loading current sprint"
      aria-busy="true"
    >
      <VisuallyHidden>Loading current sprint.</VisuallyHidden>
      <Skeleton shape="circle" width="6.5rem" />
      <span className="lifeos-sprint-week-summary__loading-copy" aria-hidden="true">
        <Skeleton width="65%" />
        <Skeleton width="90%" />
        <Skeleton width="45%" />
      </span>
    </div>
  );
}

function SprintReady({
  state,
  locale,
  sprintsHref,
}: {
  readonly state: Extract<TodaySprintState, { readonly type: "ready" }>;
  readonly locale: string;
  readonly sprintsHref: string;
}) {
  const { sprint } = state;
  const formatter = new Intl.NumberFormat(locale);
  const completed = Math.max(0, sprint.completedStoryPoints);
  const total = Math.max(0, sprint.totalStoryPoints);
  const boundedCompleted = total > 0 ? Math.min(completed, total) : completed;
  const remaining = Math.max(0, total - boundedCompleted);
  const progressText = `${formatter.format(completed)} of ${formatter.format(total)} sprint points completed.`;
  const dateText = `${formatLocalDate(sprint.startDate, locale)} – ${formatLocalDate(sprint.endDate, locale)}`;

  return (
    <div className="lifeos-sprint-week-summary__ready">
      {total > 0 ? (
        <DonutChart
          data={[
            { id: "completed", label: "Completed", value: boundedCompleted, colorName: "green" },
            { id: "remaining", label: "Remaining", value: remaining, colorName: "blue" },
          ]}
          label={`${sprint.name} sprint progress`}
          locale={locale}
          centerText={`${formatter.format(completed)}/${formatter.format(total)}`}
          valueFormatter={(value) => `${formatter.format(value)} points`}
          className="lifeos-sprint-week-summary__donut"
        />
      ) : (
        <div className="lifeos-sprint-week-summary__no-denominator" aria-hidden="true">
          <Icon icon={Gauge} decorative />
        </div>
      )}

      <div className="lifeos-sprint-week-summary__details">
        <Text weight="semibold">{sprint.name}</Text>
        <Text size="xs" tone="secondary" numeric>
          {dateText}
        </Text>
        <Text size="sm" tone="secondary" numeric>
          {total > 0 ? progressText : "No sprint points are committed yet."}
        </Text>
        <Link href={`${sprintsHref}/${encodeURIComponent(sprint.sprintId)}`}>Open sprint</Link>
      </div>
    </div>
  );
}
