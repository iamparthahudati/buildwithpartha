import { useSearchParams } from "react-router-dom";

import {
  useWeekPlanner,
  useWeekPlannerMutations,
  WeekPlannerScreen,
  type TaskAllocationValue,
  type WeeklyOutcome,
} from "@features/week-planner";
import { addLocalDays, todayLocalDate } from "@lib/localDateTime";
import { useToast } from "@state/toastQueue";

export function WeekPlannerRoute() {
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const weekDateParam = searchParams.get("weekDate") ?? searchParams.get("date") ?? undefined;
  const selectedDateParam = searchParams.get("date") ?? undefined;

  const { plan, rawPlan, unscheduledTasks, isLoading, isError, error, refetch } = useWeekPlanner(
    weekDateParam,
    selectedDateParam,
  );

  const currentWeekStart = plan?.weekStartDate ?? weekDateParam ?? todayLocalDate("UTC");

  const mutations = useWeekPlannerMutations({
    rawPlan,
    targetWeekDate: currentWeekStart,
  });

  const handleSelectDate = (date: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("date", date);
      return next;
    });
  };

  const handleNavigateWeek = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      const today = todayLocalDate("UTC");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("date", today);
        next.set("weekDate", today);
        return next;
      });
      push({ tone: "info", message: "Navigated to current week" });
      return;
    }

    const shiftDays = direction === "prev" ? -7 : 7;
    const newWeekDate = addLocalDays(currentWeekStart, shiftDays);

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("weekDate", newWeekDate);
      next.set("date", newWeekDate);
      return next;
    });
    push({
      tone: "info",
      message: `Navigated to ${direction === "prev" ? "previous" : "next"} week`,
    });
  };

  const handleUpdateDayCapacity = async (dayLocalDate: string, availableMinutes: number) => {
    try {
      await mutations.updateDayCapacity(dayLocalDate, availableMinutes);
      push({ tone: "success", message: "Day capacity updated" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update day capacity";
      push({ tone: "danger", message: msg });
    }
  };

  const handleCreateOutcome = async (title: string) => {
    try {
      await mutations.createOutcome(title);
      push({ tone: "success", message: "Weekly outcome created" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create outcome";
      push({ tone: "danger", message: msg });
    }
  };

  const handleReorderOutcomes = async (reordered: readonly WeeklyOutcome[]) => {
    try {
      await mutations.reorderOutcomes(reordered);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reorder outcomes";
      push({ tone: "danger", message: msg });
    }
  };

  const handleAllocateTask = async (taskId: string, allocation: TaskAllocationValue) => {
    try {
      await mutations.allocateTask(taskId, allocation);
      push({ tone: "success", message: "Task allocated to day schedule" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to allocate task";
      push({ tone: "danger", message: msg });
    }
  };

  const handleUnallocateTask = async (taskId: string) => {
    try {
      await mutations.unallocateTask(taskId);
      push({ tone: "info", message: "Task unallocated back to queue" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unallocate task";
      push({ tone: "danger", message: msg });
    }
  };

  const handleFinalizePlan = async () => {
    try {
      await mutations.finalizePlan();
      push({ tone: "success", message: "Week plan finalized successfully" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to finalize week plan";
      push({ tone: "danger", message: msg });
    }
  };

  const handleReopenPlan = async () => {
    try {
      await mutations.reopenPlan();
      push({ tone: "info", message: "Week plan reopened for editing" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reopen week plan";
      push({ tone: "danger", message: msg });
    }
  };

  const activeSelectedDate =
    selectedDateParam ??
    plan?.days.find((d) => d.isToday)?.localDate ??
    plan?.days[0]?.localDate ??
    currentWeekStart;

  return (
    <WeekPlannerScreen
      weekLabel={plan?.weekLabel ?? "Week Plan"}
      days={plan?.days ?? []}
      {...(plan?.capacitySummary ? { capacitySummary: plan.capacitySummary } : {})}
      outcomes={plan?.outcomes ?? []}
      unscheduledTasks={unscheduledTasks}
      allocatedTasks={plan?.allocatedTasks ?? []}
      dayOptions={plan?.dayOptions ?? []}
      conflicts={plan?.conflicts ?? []}
      selectedDate={activeSelectedDate}
      status={plan?.status ?? "DRAFT"}
      loading={isLoading}
      error={isError ? (error ?? "Failed to load week plan") : null}
      actionPending={mutations.isPending}
      actionError={mutations.error}
      onNavigateWeek={handleNavigateWeek}
      onSelectDate={handleSelectDate}
      onUpdateDayCapacity={handleUpdateDayCapacity}
      onCreateOutcome={handleCreateOutcome}
      onReorderOutcomes={handleReorderOutcomes}
      onAllocateTask={handleAllocateTask}
      onUnallocateTask={handleUnallocateTask}
      onFinalizePlan={handleFinalizePlan}
      onReopenPlan={handleReopenPlan}
      onRetry={refetch}
    />
  );
}
