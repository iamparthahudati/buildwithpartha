import { useOutletContext } from "react-router-dom";

import type { AppShellOutletContext } from "@components/layout";
import { TodayHeaderSection, type TodayMetricsData } from "@features/today";
import { useAuthSession } from "@state/authSession";

import "./today-route.css";

/**
 * TodayRoute (LOS-0608).
 *
 * The Today screen's outermost route element, mounted inside `ProtectedShell`
 * at `/life-os/app/today`. Reads the authenticated session that `RequireAuth`
 * already guarantees is non-null — the same pattern `ProtectedShell` in
 * `AppRouter.tsx` already uses — so the route does not need its own auth check.
 *
 * Composes `TodayHeaderSection` (greeting + date + helper + metric cards)
 * using the confirmed user `timeZone`, `locale`, and `displayName`. Until
 * LOS-0615 integrates the Today aggregation endpoint, the strip renders
 * honest zero-data states rather than invented values or permanent loading.
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

  // RequireAuth guarantees this but TypeScript cannot see it from here.
  if (user === null) return null;

  return (
    <div className="lifeos-today-route">
      <TodayHeaderSection
        displayName={user.displayName}
        timeZone={user.timeZone}
        locale={user.locale}
        subtitle={TODAY_HELPER}
        onQuickAddClick={onQuickAddClick}
        {...FOUNDATION_EMPTY_METRICS}
      />
    </div>
  );
}
