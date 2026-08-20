import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import type { AppShellOutletContext } from "@components/layout";
import { TodayScreen, type TodayBrainCaptureStatus, type TodayMetricsData } from "@features/today";
import { todayLocalDate } from "@lib/localDateTime";
import { useAuthSession } from "@state/authSession";

import "./today-route.css";

/**
 * TodayRoute (LOS-0614).
 *
 * The Today screen's outermost route element, mounted inside `ProtectedShell`
 * at `/life-os/app/today`. Reads the authenticated session that `RequireAuth`
 * already guarantees is non-null — the same pattern `ProtectedShell` in
 * `AppRouter.tsx` already uses — so the route does not need its own auth check.
 *
 * Composes the complete Today screen using the confirmed user `timeZone`,
 * `locale`, and `displayName`. Until LOS-0615 integrates the Today aggregation
 * endpoint, every data-bearing region renders its honest first-use state.
 *
 * The Quick Add dialog is already mounted at shell level by `ProtectedShell`
 * and triggered via `AppShell`'s `onQuickAddTriggerClick`. The inline Quick
 * Add button in `TodayHeader` fires the same shell-owned dialog through React
 * Router's outlet context, so the header and TopBar share one action without
 * either feature owning a second dialog instance.
 */

const TODAY_HELPER = "See what needs attention and choose what to do next.";

const FOUNDATION_EMPTY_METRICS: TodayMetricsData = {
  mitStatus: { type: "empty", message: "No focus chosen yet." },
  tasksStatus: { type: "empty", message: "No tasks planned for today." },
  scheduledTimeStatus: { type: "empty", message: "No Time Blocks scheduled today." },
  focusTimeStatus: { type: "empty", message: "No focus time recorded today." },
  activeProjectsStatus: { type: "empty", message: "No active projects yet." },
  weekProgressStatus: { type: "empty", message: "No Weekly Plan yet." },
};

export function TodayRoute() {
  const { user } = useAuthSession();
  const { onQuickAddClick } = useOutletContext<AppShellOutletContext>();
  const [captureValue, setCaptureValue] = useState("");
  const [captureStatus, setCaptureStatus] = useState<TodayBrainCaptureStatus>({ type: "idle" });

  // RequireAuth guarantees this but TypeScript cannot see it from here.
  if (user === null) return null;

  const dailyReviewHref = `/life-os/app/reviews/daily/${todayLocalDate(user.timeZone)}`;

  return (
    <div className="lifeos-today-route">
      <TodayScreen
        displayName={user.displayName}
        timeZone={user.timeZone}
        locale={user.locale}
        subtitle={TODAY_HELPER}
        onQuickAddClick={onQuickAddClick}
        {...FOUNDATION_EMPTY_METRICS}
        plan={{
          mitState: { type: "empty" },
          tasksState: { type: "empty" },
          onChooseMit: onQuickAddClick,
          onChangeMit: () => {},
          onSetMit: () => {},
          onMarkDone: () => {},
          onStartFocus: () => {},
          onAddTask: onQuickAddClick,
        }}
        nextUp={{
          status: { type: "empty", availability: "no-focus-selected" },
          sourceLabel: "Open tasks",
          rankingRule: "Priority, then due date, then planned order",
          tasksHref: "/life-os/app/tasks",
        }}
        schedule={{
          state: { type: "empty" },
          onAddTimeBlock: onQuickAddClick,
          onStartFocus: () => {},
        }}
        review={{
          status: {
            type: "ready",
            data: {
              morning: { state: "NOT_STARTED", href: dailyReviewHref },
              evening: { state: "NOT_STARTED", href: dailyReviewHref },
            },
          },
          reviewsHref: "/life-os/app/reviews",
        }}
        sprintWeek={{ sprintState: { type: "empty" }, weekState: { type: "empty" } }}
        activeProjects={{
          status: { type: "empty" },
          sourceLabel: "Active Projects",
          projectsHref: "/life-os/app/projects",
          onAddProject: onQuickAddClick,
        }}
        brainCapture={{
          value: captureValue,
          onValueChange: (value) => {
            setCaptureValue(value);
            if (captureStatus.type === "error") setCaptureStatus({ type: "idle" });
          },
          onCapture: () =>
            setCaptureStatus({
              type: "error",
              message: "Brain Dump capture isn't connected yet. Your text remains here.",
            }),
          countStatus: { type: "ready", unprocessedCount: 0 },
          captureStatus,
          isOnline: true,
          brainDumpHref: "/life-os/app/brain-dump",
        }}
      />
    </div>
  );
}
