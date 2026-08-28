import { apiRequest } from "@lib/apiClient";
import { addLocalDays, formatLocalDate, todayLocalDate } from "@lib/localDateTime";

import type {
  WeekCapacitySummaryData,
  WeekDayPlan,
  WeeklyOutcome,
  WeekPlannerConflict,
  WeekPlannerDayOption,
  WeekPlannerTaskAllocation,
  WeekPlannerTaskPriority,
  WeekPlannerTaskStatus,
  WeekPlanStatus,
} from "../model/weekPlanner";

export interface WeeklyPlanCapacityResponseDto {
  readonly localDate: string;
  readonly availableMinutes: number;
}

export interface WeeklyPlanOutcomeResponseDto {
  readonly id: string;
  readonly title: string;
  readonly position: number;
}

export interface WeeklyPlanItemResponseDto {
  readonly id: string;
  readonly taskId: string;
  readonly outcomeId?: string | null;
  readonly plannedDate?: string | null;
  readonly plannedMinutes: number;
  readonly position: number;
  readonly taskTitleSnapshot: string;
  readonly taskStatusSnapshot: string;
}

export interface WeeklyPlanConflictResponseDto {
  readonly hasWarnings: boolean;
  readonly totalPlannedMinutes: number;
  readonly totalCapacityMinutes: number;
  readonly overcapacityMinutes: number;
  readonly overcapacityDates: readonly string[];
  readonly overlappingTimeBlockCount: number;
  readonly unscheduledItemCount: number;
  readonly outcomesWithoutItemsCount: number;
}

export interface WeeklyPlanResponseDto {
  readonly id: string;
  readonly weekStartDate: string;
  readonly weekEndDate: string;
  readonly timeZone: string;
  readonly weekStartDay: number;
  readonly revision: number;
  readonly status: WeekPlanStatus;
  readonly predecessorPlanId?: string | null;
  readonly finalizedAt?: string | null;
  readonly capacities: readonly WeeklyPlanCapacityResponseDto[];
  readonly outcomes: readonly WeeklyPlanOutcomeResponseDto[];
  readonly items: readonly WeeklyPlanItemResponseDto[];
  readonly conflictSummary: WeeklyPlanConflictResponseDto;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface WeeklyPlanCapacityRequestDto {
  readonly localDate: string;
  readonly availableMinutes: number;
}

export interface WeeklyPlanOutcomeRequestDto {
  readonly id?: string | null;
  readonly title: string;
  readonly position: number;
}

export interface WeeklyPlanItemRequestDto {
  readonly id?: string | null;
  readonly taskId: string;
  readonly outcomeId?: string | null;
  readonly plannedDate?: string | null;
  readonly plannedMinutes: number;
  readonly position: number;
}

export interface CreateWeeklyPlanRequestDto {
  readonly weekDate: string;
  readonly capacities: readonly WeeklyPlanCapacityRequestDto[];
  readonly outcomes: readonly WeeklyPlanOutcomeRequestDto[];
  readonly items: readonly WeeklyPlanItemRequestDto[];
}

export interface UpdateWeeklyPlanRequestDto {
  readonly capacities: readonly WeeklyPlanCapacityRequestDto[];
  readonly outcomes: readonly WeeklyPlanOutcomeRequestDto[];
  readonly items: readonly WeeklyPlanItemRequestDto[];
  readonly version: number;
}

export interface WeeklyPlanVersionRequestDto {
  readonly version: number;
}

export interface TaskContextInfo {
  readonly id: string;
  readonly title: string;
  readonly status: WeekPlannerTaskStatus;
  readonly priority: WeekPlannerTaskPriority;
  readonly projectName?: string;
}

export interface MappedWeeklyPlanData {
  readonly weekLabel: string;
  readonly days: readonly WeekDayPlan[];
  readonly capacitySummary: WeekCapacitySummaryData;
  readonly outcomes: readonly WeeklyOutcome[];
  readonly allocatedTasks: readonly WeekPlannerTaskAllocation[];
  readonly dayOptions: readonly WeekPlannerDayOption[];
  readonly conflicts: readonly WeekPlannerConflict[];
  readonly status: WeekPlanStatus;
  readonly version: number;
  readonly id: string;
  readonly weekStartDate: string;
  readonly weekEndDate: string;
  readonly timeZone: string;
}

export function mapWeeklyPlanResponse(
  dto: WeeklyPlanResponseDto,
  taskById: ReadonlyMap<string, TaskContextInfo> = new Map(),
  selectedDate?: string,
  locale = "en-US",
): MappedWeeklyPlanData {
  const startStr = dto.weekStartDate;
  const endStr = dto.weekEndDate;
  const todayStr = todayLocalDate(dto.timeZone || "UTC");

  const startFormatted = formatLocalDate(startStr, locale, { month: "short", day: "numeric" });
  const endFormatted = formatLocalDate(endStr, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const weekLabel = `${startFormatted} – ${endFormatted}`;

  const dayPlans: WeekDayPlan[] = [];
  const dayOptions: WeekPlannerDayOption[] = [];

  for (let i = 0; i < 7; i++) {
    const localDate = addLocalDays(startStr, i);
    const dayOfWeek = formatLocalDate(localDate, "en-US", { weekday: "short" });
    const isToday = localDate === todayStr;
    const isSelected = selectedDate ? localDate === selectedDate : isToday;

    const capacityObj = dto.capacities.find((c) => c.localDate === localDate);
    const availableMinutes = capacityObj?.availableMinutes ?? 0;

    const dayItems = dto.items.filter((item) => item.plannedDate === localDate);
    const plannedMinutes = dayItems.reduce((sum, item) => sum + item.plannedMinutes, 0);

    const totalTasksCount = dayItems.length;
    const completedTasksCount = dayItems.filter((item) => {
      const taskCtx = taskById.get(item.taskId);
      const st = taskCtx?.status ?? item.taskStatusSnapshot;
      return st === "DONE";
    }).length;

    const isOvercapacity =
      plannedMinutes > availableMinutes ||
      dto.conflictSummary.overcapacityDates.includes(localDate);

    dayPlans.push({
      localDate,
      dayOfWeek,
      isToday,
      isSelected,
      plannedMinutes,
      availableMinutes,
      totalTasksCount,
      completedTasksCount,
      isOvercapacity,
      hasConflict: isOvercapacity,
    });

    let optionLabel = `${dayOfWeek}, ${formatLocalDate(localDate, locale, { month: "short", day: "numeric" })}`;
    if (isOvercapacity) {
      optionLabel += " (Overcapacity)";
    } else if (isToday) {
      optionLabel += " (Today)";
    }

    dayOptions.push({
      localDate,
      label: optionLabel,
    });
  }

  const sortedOutcomes = [...dto.outcomes].sort((a, b) => a.position - b.position);

  const outcomes: WeeklyOutcome[] = sortedOutcomes.map((outcome) => {
    const itemCount = dto.items.filter((item) => item.outcomeId === outcome.id).length;
    return {
      id: outcome.id,
      title: outcome.title,
      selected: true,
      itemCount,
    };
  });

  const outcomeTitleById = new Map<string, string>();
  for (const o of dto.outcomes) {
    outcomeTitleById.set(o.id, o.title);
  }

  const allocatedTasks: WeekPlannerTaskAllocation[] = dto.items
    .filter((item) => item.plannedDate != null)
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const taskCtx = taskById.get(item.taskId);
      const taskTitle = taskCtx?.title ?? item.taskTitleSnapshot;
      const status = taskCtx?.status ?? (item.taskStatusSnapshot as WeekPlannerTaskStatus);
      const priority = taskCtx?.priority ?? "P2";
      const projectName = taskCtx?.projectName;
      const outcomeTitle = item.outcomeId ? outcomeTitleById.get(item.outcomeId) : undefined;

      return {
        taskId: item.taskId,
        taskTitle,
        localDate: item.plannedDate!,
        outcomeId: item.outcomeId ?? null,
        ...(outcomeTitle ? { outcomeTitle } : {}),
        plannedMinutes: item.plannedMinutes,
        status,
        priority,
        ...(projectName ? { projectName } : {}),
      };
    });

  const conflicts: WeekPlannerConflict[] = [];

  if (dto.conflictSummary.overcapacityDates.length > 0) {
    for (const date of dto.conflictSummary.overcapacityDates) {
      const dayPlan = dayPlans.find((d) => d.localDate === date);
      const planned = dayPlan?.plannedMinutes ?? 0;
      const avail = dayPlan?.availableMinutes ?? 0;
      const dayName = formatLocalDate(date, locale, {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      conflicts.push({
        id: `overcapacity-${date}`,
        type: "OVERCAPACITY",
        message: `${dayName} is overcapacity (${planned}m planned / ${avail}m available).`,
        severity: "warning",
        date,
      });
    }
  }

  if (dto.conflictSummary.outcomesWithoutItemsCount > 0) {
    conflicts.push({
      id: "unallocated-outcomes",
      type: "UNALLOCATED_OUTCOME",
      message: `${dto.conflictSummary.outcomesWithoutItemsCount} weekly outcome(s) have no allocated tasks.`,
      severity: "warning",
    });
  }

  if (dto.conflictSummary.unscheduledItemCount > 0) {
    conflicts.push({
      id: "unscheduled-items",
      type: "UNSCHEDULED_PRIORITY",
      message: `${dto.conflictSummary.unscheduledItemCount} item(s) in this plan remain unscheduled.`,
      severity: "warning",
    });
  }

  if (dto.conflictSummary.overlappingTimeBlockCount > 0) {
    conflicts.push({
      id: "time-block-overlaps",
      type: "TIME_BLOCK_OVERLAP",
      message: `${dto.conflictSummary.overlappingTimeBlockCount} time block overlap(s) detected during this week.`,
      severity: "warning",
    });
  }

  const capacitySummary: WeekCapacitySummaryData = {
    totalPlannedMinutes: dto.conflictSummary.totalPlannedMinutes,
    totalAvailableMinutes: dto.conflictSummary.totalCapacityMinutes,
    overcapacityMinutes: dto.conflictSummary.overcapacityMinutes,
    totalTasksCount: allocatedTasks.length,
    completedTasksCount: allocatedTasks.filter((t) => t.status === "DONE").length,
    daysCount: 7,
    hasConflicts: dto.conflictSummary.hasWarnings,
  };

  return {
    weekLabel,
    days: dayPlans,
    capacitySummary,
    outcomes,
    allocatedTasks,
    dayOptions,
    conflicts,
    status: dto.status,
    version: dto.version,
    id: dto.id,
    weekStartDate: dto.weekStartDate,
    weekEndDate: dto.weekEndDate,
    timeZone: dto.timeZone,
  };
}

export async function listWeeklyPlans(
  weekDate?: string,
  signal?: AbortSignal,
): Promise<readonly WeeklyPlanResponseDto[]> {
  const query = weekDate ? `?weekDate=${encodeURIComponent(weekDate)}` : "";
  return apiRequest<readonly WeeklyPlanResponseDto[]>(`/weekly-plans${query}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
}

export function getWeeklyPlan(id: string, signal?: AbortSignal): Promise<WeeklyPlanResponseDto> {
  return apiRequest<WeeklyPlanResponseDto>(`/weekly-plans/${id}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
}

export function createWeeklyPlan(
  request: CreateWeeklyPlanRequestDto,
): Promise<WeeklyPlanResponseDto> {
  return apiRequest<WeeklyPlanResponseDto>("/weekly-plans", {
    method: "POST",
    body: request,
  });
}

export function updateWeeklyPlan(
  id: string,
  request: UpdateWeeklyPlanRequestDto,
): Promise<WeeklyPlanResponseDto> {
  return apiRequest<WeeklyPlanResponseDto>(`/weekly-plans/${id}`, {
    method: "PUT",
    body: request,
  });
}

export function finalizeWeeklyPlan(id: string, version: number): Promise<WeeklyPlanResponseDto> {
  return apiRequest<WeeklyPlanResponseDto>(`/weekly-plans/${id}/finalize`, {
    method: "POST",
    body: { version },
  });
}

export function reopenWeeklyPlan(id: string, version: number): Promise<WeeklyPlanResponseDto> {
  return apiRequest<WeeklyPlanResponseDto>(`/weekly-plans/${id}/reopen`, {
    method: "POST",
    body: { version },
  });
}
