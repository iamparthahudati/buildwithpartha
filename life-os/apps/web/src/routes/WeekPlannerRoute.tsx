import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  MOCK_ALLOCATED_TASKS,
  MOCK_DAY_OPTIONS,
  MOCK_UNSCHEDULED_TASKS,
  MOCK_WEEK_CAPACITY_SUMMARY,
  MOCK_WEEK_CONFLICTS,
  MOCK_WEEK_DAYS,
  MOCK_WEEKLY_OUTCOMES,
  WeekPlannerScreen,
  type TaskAllocationValue,
  type WeekCapacitySummaryData,
  type WeekDayPlan,
  type WeeklyOutcome,
  type WeekPlanStatus,
  type WeekPlannerTask,
  type WeekPlannerTaskAllocation,
} from "@features/week-planner";
import { useToast } from "@state/toastQueue";

export function WeekPlannerRoute() {
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [days, setDays] = useState<readonly WeekDayPlan[]>(MOCK_WEEK_DAYS);
  const [capacitySummary, setCapacitySummary] = useState<WeekCapacitySummaryData>(
    MOCK_WEEK_CAPACITY_SUMMARY,
  );
  const [outcomes, setOutcomes] = useState<readonly WeeklyOutcome[]>(MOCK_WEEKLY_OUTCOMES);
  const [unscheduledTasks, setUnscheduledTasks] =
    useState<readonly WeekPlannerTask[]>(MOCK_UNSCHEDULED_TASKS);
  const [allocatedTasks, setAllocatedTasks] =
    useState<readonly WeekPlannerTaskAllocation[]>(MOCK_ALLOCATED_TASKS);
  const [status, setStatus] = useState<WeekPlanStatus>("DRAFT");

  const selectedDateParam = searchParams.get("date") ?? "2026-08-20";

  const handleSelectDate = (date: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("date", date);
      return next;
    });
  };

  const handleNavigateWeek = (direction: "prev" | "next" | "today") => {
    push({ tone: "info", message: `Navigated ${direction} week` });
  };

  const handleUpdateDayCapacity = (dayLocalDate: string, availableMinutes: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.localDate === dayLocalDate
          ? {
              ...d,
              availableMinutes,
              isOvercapacity: d.plannedMinutes > availableMinutes,
            }
          : d,
      ),
    );
    setCapacitySummary((prev) => {
      const newTotalAvailable = days.reduce(
        (sum, d) =>
          d.localDate === dayLocalDate ? sum + availableMinutes : sum + d.availableMinutes,
        0,
      );
      return {
        ...prev,
        totalAvailableMinutes: newTotalAvailable,
      };
    });
    push({ tone: "success", message: "Day capacity updated" });
  };

  const handleSelectOutcome = (outcomeId: string) => {
    setOutcomes((prev) =>
      prev.map((o) => (o.id === outcomeId ? { ...o, selected: !o.selected } : o)),
    );
  };

  const handleCreateOutcome = (title: string) => {
    const newOutcome: WeeklyOutcome = {
      id: `outcome-${Date.now()}`,
      title,
      selected: true,
      itemCount: 0,
    };
    setOutcomes((prev) => [...prev, newOutcome]);
    push({ tone: "success", message: "Weekly outcome created" });
  };

  const handleReorderOutcomes = (reordered: readonly WeeklyOutcome[]) => {
    setOutcomes(reordered);
  };

  const handleAllocateTask = (taskId: string, allocation: TaskAllocationValue) => {
    const task = unscheduledTasks.find((t) => t.id === taskId);
    if (!task) return;

    if (allocation.localDate) {
      const outcome = outcomes.find((o) => o.id === allocation.outcomeId);
      const newAllocated: WeekPlannerTaskAllocation = {
        taskId: task.id,
        taskTitle: task.title,
        localDate: allocation.localDate,
        ...(allocation.outcomeId ? { outcomeId: allocation.outcomeId } : {}),
        ...(outcome?.title ? { outcomeTitle: outcome.title } : {}),
        plannedMinutes: allocation.plannedMinutes || (task.estimateMinutes ?? 60),
        status: task.status,
        priority: task.priority,
        ...(task.projectName ? { projectName: task.projectName } : {}),
      };
      setAllocatedTasks((prev) => [...prev.filter((a) => a.taskId !== taskId), newAllocated]);
      setUnscheduledTasks((prev) => prev.filter((t) => t.id !== taskId));
      push({ tone: "success", message: "Task allocated to day schedule" });
    }
  };

  const handleUnallocateTask = (taskId: string) => {
    const alloc = allocatedTasks.find((a) => a.taskId === taskId);
    if (!alloc) return;

    const restoredTask: WeekPlannerTask = {
      id: alloc.taskId,
      title: alloc.taskTitle,
      status: alloc.status,
      priority: alloc.priority,
      ...(alloc.projectName ? { projectName: alloc.projectName } : {}),
      estimateMinutes: alloc.plannedMinutes,
    };

    setAllocatedTasks((prev) => prev.filter((a) => a.taskId !== taskId));
    setUnscheduledTasks((prev) => [...prev, restoredTask]);
    push({ tone: "info", message: "Task unallocated back to queue" });
  };

  const handleCarryOverTask = (_taskId: string) => {
    push({ tone: "info", message: "Task flagged for carry-over" });
  };

  const handleFinalizePlan = () => {
    setStatus("FINALIZED");
    push({ tone: "success", message: "Week plan finalized successfully" });
  };

  const handleReopenPlan = () => {
    setStatus("DRAFT");
    push({ tone: "info", message: "Week plan reopened for editing" });
  };

  return (
    <WeekPlannerScreen
      weekLabel="Aug 17 – Aug 23, 2026"
      days={days}
      capacitySummary={capacitySummary}
      outcomes={outcomes}
      unscheduledTasks={unscheduledTasks}
      allocatedTasks={allocatedTasks}
      dayOptions={MOCK_DAY_OPTIONS}
      conflicts={MOCK_WEEK_CONFLICTS}
      selectedDate={selectedDateParam}
      status={status}
      onNavigateWeek={handleNavigateWeek}
      onSelectDate={handleSelectDate}
      onUpdateDayCapacity={handleUpdateDayCapacity}
      onSelectOutcome={handleSelectOutcome}
      onCreateOutcome={handleCreateOutcome}
      onReorderOutcomes={handleReorderOutcomes}
      onAllocateTask={handleAllocateTask}
      onUnallocateTask={handleUnallocateTask}
      onCarryOverTask={handleCarryOverTask}
      onFinalizePlan={handleFinalizePlan}
      onReopenPlan={handleReopenPlan}
    />
  );
}
