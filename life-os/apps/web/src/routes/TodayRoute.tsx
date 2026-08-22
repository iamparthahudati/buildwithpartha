import { useCallback, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import type { AppShellOutletContext } from "@components/layout";
import {
  createErrorTodayViewModel,
  createLoadingTodayViewModel,
  formatTodayLastUpdated,
  mapTodayResponse,
  TodayScreen,
  useToday,
  useTodayOnlineStatus,
  type TodayBrainCaptureStatus,
} from "@features/today";
import { useAuthSession } from "@state/authSession";

import "./today-route.css";

/**
 * TodayRoute (LOS-0615).
 *
 * The Today screen's outermost route element, mounted inside `ProtectedShell`
 * at `/life-os/app/today`. Reads the authenticated session that `RequireAuth`
 * already guarantees is non-null — the same pattern `ProtectedShell` in
 * `AppRouter.tsx` already uses — so the route does not need its own auth check.
 *
 * Fetches the modular Today aggregation and maps every provider independently
 * into the complete screen composed by LOS-0614. A failed provider remains an
 * isolated retryable region; a failed refresh keeps the last successful query
 * data visible. The shared API client owns session-expiry recovery.
 *
 * The Quick Add dialog is already mounted at shell level by `ProtectedShell`
 * and triggered via `AppShell`'s `onQuickAddTriggerClick`. The inline Quick
 * Add button in `TodayHeader` fires the same shell-owned dialog through React
 * Router's outlet context, so the header and TopBar share one action without
 * either feature owning a second dialog instance.
 */

const TODAY_HELPER = "See what needs attention and choose what to do next.";

export function TodayRoute() {
  const { user } = useAuthSession();
  const { onQuickAddClick } = useOutletContext<AppShellOutletContext>();
  const navigate = useNavigate();
  const [captureValue, setCaptureValue] = useState("");
  const [captureStatus, setCaptureStatus] = useState<TodayBrainCaptureStatus>({ type: "idle" });
  const todayQuery = useToday(user?.timeZone ?? "UTC", user !== null);
  const { refetch: refetchToday } = todayQuery;
  const isOnline = useTodayOnlineStatus();

  const viewModel = useMemo(() => {
    if (todayQuery.data && user) return mapTodayResponse(todayQuery.data, user.locale);
    return todayQuery.isPending && isOnline
      ? createLoadingTodayViewModel()
      : createErrorTodayViewModel();
  }, [isOnline, todayQuery.data, todayQuery.isPending, user]);

  const retryToday = useCallback(() => {
    void refetchToday();
  }, [refetchToday]);

  // RequireAuth guarantees this but TypeScript cannot see it from here.
  if (user === null) return null;

  const timeZone = viewModel.userTimeZone ?? user.timeZone;
  const connectionState = !isOnline
    ? {
        type: "offline" as const,
        ...(viewModel.generatedAt
          ? {
              lastUpdatedLabel: formatTodayLastUpdated(
                viewModel.generatedAt,
                user.locale,
                timeZone,
              ),
            }
          : {}),
      }
    : ({ type: "online" } as const);

  return (
    <div className="lifeos-today-route">
      <TodayScreen
        displayName={user.displayName}
        timeZone={timeZone}
        locale={user.locale}
        subtitle={TODAY_HELPER}
        onQuickAddClick={() => onQuickAddClick()}
        mitStatus={viewModel.mitStatus}
        tasksStatus={viewModel.tasksStatus}
        scheduledTimeStatus={viewModel.scheduledTimeStatus}
        focusTimeStatus={viewModel.focusTimeStatus}
        activeProjectsStatus={viewModel.activeProjectsStatus}
        weekProgressStatus={viewModel.weekProgressStatus}
        onRetryMit={retryToday}
        onRetryTasks={retryToday}
        onRetryScheduledTime={retryToday}
        onRetryFocusTime={retryToday}
        onRetryActiveProjects={retryToday}
        onRetryWeekProgress={retryToday}
        connectionState={connectionState}
        planningState={viewModel.planningState}
        plan={{
          ...viewModel.plan,
          onChooseMit: () => navigate("/life-os/app/tasks"),
          onChangeMit: () => navigate("/life-os/app/tasks"),
          onSetMit: () => {},
          onMarkDone: () => {},
          onStartFocus: () => {},
          onAddTask: () => onQuickAddClick("task"),
          onRetryMit: retryToday,
          onRetryTasks: retryToday,
        }}
        nextUp={{
          status: viewModel.nextUpStatus,
          sourceLabel: "Open tasks",
          rankingRule: "Priority, then due date, then planned order",
          tasksHref: "/life-os/app/tasks",
          onRetry: retryToday,
        }}
        schedule={{
          state: viewModel.scheduleState,
          onAddTimeBlock: () => onQuickAddClick("time-block"),
          onStartFocus: () => {},
          onRetry: retryToday,
          startDisabledReason: "Focus actions aren't available from Today yet.",
        }}
        review={{
          status: viewModel.reviewStatus,
          reviewsHref: "/life-os/app/reviews",
          onRetry: retryToday,
        }}
        sprintWeek={{
          sprintState: viewModel.sprintState,
          weekState: viewModel.weekState,
          onRetrySprint: retryToday,
          onRetryWeek: retryToday,
        }}
        activeProjects={{
          status: viewModel.projectsStatus,
          sourceLabel: "Active Projects",
          projectsHref: "/life-os/app/projects",
          onAddProject: () => onQuickAddClick("project"),
          onRetry: retryToday,
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
          countStatus: viewModel.brainDumpCountStatus,
          captureStatus,
          isOnline,
          offlineDraftSupported: false,
          brainDumpHref: "/life-os/app/brain-dump",
          onRetryCount: retryToday,
        }}
      />
    </div>
  );
}
