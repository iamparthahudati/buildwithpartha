export interface WeekDayCategoryAllocation {
  readonly category: string;
  readonly minutes: number;
  readonly color?: string;
}

export interface WeekDayPlan {
  readonly localDate: string;
  readonly dayOfWeek?: string;
  readonly isToday?: boolean;
  readonly isSelected?: boolean;
  readonly plannedMinutes: number;
  readonly availableMinutes: number;
  readonly totalTasksCount: number;
  readonly completedTasksCount: number;
  readonly timeBlocksCount?: number;
  readonly hasConflict?: boolean;
  readonly isOvercapacity?: boolean;
  readonly categoryBreakdown?: readonly WeekDayCategoryAllocation[];
}

export interface WeekCapacitySummaryData {
  readonly totalPlannedMinutes: number;
  readonly totalAvailableMinutes: number;
  readonly overcapacityMinutes?: number;
  readonly totalTasksCount: number;
  readonly completedTasksCount: number;
  readonly daysCount?: number;
  readonly hasConflicts?: boolean;
  readonly categoryBreakdown?: readonly WeekDayCategoryAllocation[];
}

export type WeekPlannerTaskStatus = "TO_DO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";

export type WeekPlannerTaskPriority = "P1" | "P2" | "P3" | "P4";

export type PlannerMutationState =
  | { readonly type: "idle" }
  | { readonly type: "saving" }
  | { readonly type: "saved" }
  | { readonly type: "failed"; readonly message: string };

export interface WeeklyOutcome {
  readonly id: string;
  readonly title: string;
  readonly selected: boolean;
  readonly itemCount?: number;
  readonly mutation?: PlannerMutationState;
}

export interface WeekPlannerTask {
  readonly id: string;
  readonly title: string;
  readonly status: WeekPlannerTaskStatus;
  readonly priority: WeekPlannerTaskPriority;
  readonly projectName?: string;
  readonly estimateMinutes?: number;
  readonly dueDate?: string;
  readonly isCarryOverCandidate?: boolean;
  readonly mutation?: PlannerMutationState;
}

export interface WeekPlannerDayOption {
  readonly localDate: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export type WeekPlanStatus = "DRAFT" | "FINALIZED";

export interface WeekPlannerTaskAllocation {
  readonly taskId: string;
  readonly taskTitle: string;
  readonly localDate: string;
  readonly outcomeId?: string | null;
  readonly outcomeTitle?: string;
  readonly plannedMinutes: number;
  readonly status: WeekPlannerTaskStatus;
  readonly priority: WeekPlannerTaskPriority;
  readonly projectName?: string;
}

export interface WeekPlannerConflict {
  readonly id: string;
  readonly type:
    "OVERCAPACITY" | "UNALLOCATED_OUTCOME" | "UNSCHEDULED_PRIORITY" | "TIME_BLOCK_OVERLAP";
  readonly message: string;
  readonly severity: "warning" | "error";
  readonly date?: string;
}

export interface TaskAllocationValue {
  readonly localDate: string | null;
  readonly outcomeId: string | null;
  readonly plannedMinutes: number;
}

export interface WeekPlannerTaskFilters {
  readonly search: string;
  readonly project: string;
  readonly priority: WeekPlannerTaskPriority | "ALL";
}

export const EMPTY_WEEK_PLANNER_TASK_FILTERS: WeekPlannerTaskFilters = Object.freeze({
  search: "",
  project: "",
  priority: "ALL",
});

export function filterWeekPlannerTasks(
  tasks: readonly WeekPlannerTask[],
  filters: WeekPlannerTaskFilters,
): readonly WeekPlannerTask[] {
  const query = filters.search.trim().toLocaleLowerCase();

  return tasks.filter((task) => {
    const matchesSearch =
      query === "" ||
      task.title.toLocaleLowerCase().includes(query) ||
      (task.projectName?.toLocaleLowerCase().includes(query) ?? false);
    const matchesProject = filters.project === "" || task.projectName === filters.project;
    const matchesPriority = filters.priority === "ALL" || task.priority === filters.priority;

    return matchesSearch && matchesProject && matchesPriority;
  });
}

/** Format minutes into human-readable hours and minutes (e.g., 90 -> "1h 30m", 480 -> "8h", 45 -> "45m"). */
export function formatMinutesToHours(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  if (safeMinutes === 0) {
    return "0m";
  }
  const hours = Math.floor(safeMinutes / 60);
  const remainingMins = safeMinutes % 60;

  if (hours > 0 && remainingMins > 0) {
    return `${hours}h ${remainingMins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${remainingMins}m`;
}

/** Calculate capacity percentage safely handling zero available capacity. */
export function calculateCapacityPercentage(
  plannedMinutes: number,
  availableMinutes: number,
): number {
  const safePlanned = Math.max(0, plannedMinutes);
  const safeAvailable = Math.max(0, availableMinutes);
  if (safeAvailable <= 0) {
    return safePlanned > 0 ? 100 : 0;
  }
  return Math.min(999, Math.round((safePlanned / safeAvailable) * 100));
}
