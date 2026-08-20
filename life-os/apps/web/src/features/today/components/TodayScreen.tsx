import { Alert } from "@components/feedback";
import { Link } from "@components/ui";

import { SprintWeekSummary, type SprintWeekSummaryProps } from "./SprintWeekSummary";
import { TodayActiveProjects, type TodayActiveProjectsProps } from "./TodayActiveProjects";
import { TodayBrainCapture, type TodayBrainCaptureProps } from "./TodayBrainCapture";
import { TodayHeaderSection } from "./TodayHeaderSection";
import { TodayNextUp, type TodayNextUpProps } from "./TodayNextUp";
import { TodayPlan, type TodayPlanProps } from "./TodayPlan";
import { TodayReviewPrompt, type TodayReviewPromptProps } from "./TodayReviewPrompt";
import { TodaySchedule, type TodayScheduleProps } from "./TodaySchedule";
import type { TodayHeaderProps } from "./TodayHeader";
import type { TodayMetricsData } from "./TodayMetricStrip";
import "./today-screen.css";

export type TodayConnectionState =
  { readonly type: "online" } | { readonly type: "offline"; readonly lastUpdatedLabel?: string };

export type TodayPlanningState =
  { readonly type: "balanced" } | { readonly type: "overloaded"; readonly reviewPlanHref: string };

export interface TodayScreenProps extends TodayHeaderProps, TodayMetricsData {
  readonly plan: TodayPlanProps;
  readonly nextUp: TodayNextUpProps;
  readonly schedule: Omit<TodayScheduleProps, "locale">;
  readonly review: TodayReviewPromptProps;
  readonly sprintWeek: Omit<SprintWeekSummaryProps, "locale">;
  readonly activeProjects: TodayActiveProjectsProps;
  readonly brainCapture: TodayBrainCaptureProps;
  readonly connectionState?: TodayConnectionState;
  readonly planningState?: TodayPlanningState;
  readonly className?: string;
}

/**
 * Complete Today composition (LOS-0614).
 *
 * The source order is the narrow-screen reading order: make the daily
 * decision, see what is next, check the schedule, review the day, then move
 * into week/Project/capture context. The desktop grid changes visual size,
 * never the semantic order. Each child retains its independent state contract
 * so a provider failure cannot replace successful content around it.
 */
export function TodayScreen({
  displayName,
  timeZone,
  locale,
  now,
  subtitle,
  onQuickAddClick,
  mitStatus,
  tasksStatus,
  scheduledTimeStatus,
  focusTimeStatus,
  activeProjectsStatus,
  weekProgressStatus,
  plan,
  nextUp,
  schedule,
  review,
  sprintWeek,
  activeProjects,
  brainCapture,
  connectionState = { type: "online" },
  planningState = { type: "balanced" },
  className,
}: TodayScreenProps) {
  return (
    <div className={["lifeos-today-screen", className].filter(Boolean).join(" ")}>
      <TodayHeaderSection
        displayName={displayName}
        timeZone={timeZone}
        locale={locale}
        {...(now ? { now } : {})}
        {...(subtitle ? { subtitle } : {})}
        onQuickAddClick={onQuickAddClick}
        mitStatus={mitStatus}
        tasksStatus={tasksStatus}
        scheduledTimeStatus={scheduledTimeStatus}
        focusTimeStatus={focusTimeStatus}
        activeProjectsStatus={activeProjectsStatus}
        weekProgressStatus={weekProgressStatus}
      />

      <div className="lifeos-today-screen__notices">
        {connectionState.type === "offline" ? (
          <Alert tone="warning" heading="You're offline">
            {connectionState.lastUpdatedLabel
              ? `Showing the last available Today data from ${connectionState.lastUpdatedLabel}. `
              : "No confirmed Today data is available on this device. "}
            Server-dependent actions remain unavailable; device-draft actions say so explicitly.
          </Alert>
        ) : null}

        {planningState.type === "overloaded" ? (
          <Alert
            tone="warning"
            heading="Today's plan needs review"
            action={<Link href={planningState.reviewPlanHref}>Review plan</Link>}
          >
            Scheduled work is above the available capacity or contains a conflict. Nothing was
            rescheduled and no priority was changed.
          </Alert>
        ) : null}
      </div>

      <div className="lifeos-today-screen__grid">
        <TodayPlan {...plan} className="lifeos-today-screen__plan" />
        <TodayNextUp {...nextUp} className="lifeos-today-screen__next-up" />
        <TodaySchedule {...schedule} locale={locale} className="lifeos-today-screen__schedule" />
        <TodayReviewPrompt {...review} className="lifeos-today-screen__review" />
        <SprintWeekSummary
          {...sprintWeek}
          locale={locale}
          className="lifeos-today-screen__sprint-week"
        />
        <TodayActiveProjects {...activeProjects} className="lifeos-today-screen__projects" />
        <TodayBrainCapture {...brainCapture} className="lifeos-today-screen__brain-capture" />
      </div>
    </div>
  );
}
