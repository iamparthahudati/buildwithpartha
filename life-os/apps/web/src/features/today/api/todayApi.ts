import { apiRequest } from "@lib/apiClient";
import type { LocalDate, LocalTime } from "@lib/localDateTime";

export type TodayWidgetStatus = "SUCCESS" | "EMPTY" | "ERROR";

export interface TodayWidget<TData> {
  readonly status: TodayWidgetStatus;
  readonly data: TData | null;
  readonly error: string | null;
}

export interface TodayProjectContextDto {
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly projectColor: string | null;
}

export interface TodayMitDto extends TodayProjectContextDto {
  readonly taskId: string;
  readonly title: string;
  readonly priority: string;
  readonly dueDate: LocalDate | null;
  readonly completed: boolean;
  readonly focusActive: boolean;
}

export interface TodayTaskDto extends TodayProjectContextDto {
  readonly id: string;
  readonly title: string;
  readonly priority: string;
  readonly dueDate: LocalDate | null;
  readonly completed: boolean;
  readonly isOverdue: boolean;
  /** A later Task provider may expose its canonical status without changing the screen contract. */
  readonly status?: string;
}

export interface TodayTimeBlockDto {
  readonly id: string;
  readonly title: string;
  readonly startTime: LocalTime;
  readonly endTime: LocalTime;
  readonly category: string | null;
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly completed: boolean;
}

export interface TodayScheduleConflictDto {
  readonly firstBlockId: string;
  readonly secondBlockId: string;
  readonly description: string;
}

export interface TodaySprintDto {
  readonly sprintId: string;
  readonly name: string;
  readonly completedStoryPoints: number;
  readonly totalStoryPoints: number;
  readonly startDate: LocalDate;
  readonly endDate: LocalDate;
}

export interface TodayWeeklyGoalDto {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

export interface TodayWeekDayDto {
  readonly localDate: LocalDate;
  readonly completedTasksCount: number;
  readonly totalTasksCount: number;
}

export interface TodayWeekDto {
  readonly completedTasksCount: number;
  readonly totalTasksCount: number;
  readonly outcomes: readonly TodayWeeklyGoalDto[];
  /** Optional modular fields reserved for the later full Weekly Plan provider. */
  readonly startDate?: LocalDate;
  readonly endDate?: LocalDate;
  readonly days?: readonly TodayWeekDayDto[];
  readonly plannedMinutes?: number;
  readonly capacityMinutes?: number;
}

export interface TodayActiveProjectDto {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
  readonly completedTasksCount: number;
  readonly totalTasksCount: number;
  readonly status: string;
}

export interface TodayReviewDto {
  readonly morningReviewCompleted: boolean;
  readonly eveningReviewCompleted: boolean;
  readonly morningReviewState: string;
  readonly eveningReviewState: string;
}

export interface TodayMetricDto {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly unit: string | null;
  readonly trend: string | null;
  readonly status: string | null;
}

export interface TodayResponse {
  readonly generatedAt: string;
  readonly userTimeZone: string;
  readonly localDate: LocalDate;
  readonly mit: TodayWidget<TodayMitDto>;
  readonly currentNextBlock: TodayWidget<{
    readonly current: TodayTimeBlockDto | null;
    readonly next: TodayTimeBlockDto | null;
  }>;
  readonly tasks: TodayWidget<{ readonly tasks: readonly TodayTaskDto[] }>;
  readonly schedule: TodayWidget<{
    readonly blocks: readonly TodayTimeBlockDto[];
    readonly conflicts: readonly TodayScheduleConflictDto[];
  }>;
  readonly overdue: TodayWidget<{
    readonly totalCount: number;
    readonly topOverdueTasks: readonly TodayTaskDto[];
  }>;
  readonly focusSummary: TodayWidget<{
    readonly actualFocusMinutesToday: number;
    readonly plannedFocusMinutesToday: number;
    readonly activeSessionTimerSummary: string | null;
    readonly isSessionActive: boolean;
    readonly dailyFocusTargetMinutes?: number | null;
    readonly comparisonMinutes?: number | null;
    readonly comparisonSource?: "PLANNED_FOCUS_BLOCKS" | "DAILY_TARGET" | "NONE";
    readonly progressPercentage?: number | null;
  }>;
  readonly sprint: TodayWidget<TodaySprintDto>;
  readonly week: TodayWidget<TodayWeekDto>;
  readonly activeProjects: TodayWidget<{
    readonly projects: readonly TodayActiveProjectDto[];
  }>;
  readonly review: TodayWidget<TodayReviewDto>;
  readonly brainDump: TodayWidget<{ readonly unprocessedCount: number }>;
  readonly habits: TodayWidget<{
    readonly habits: readonly {
      readonly id: string;
      readonly name: string;
      readonly cadence: "DAILY" | "WEEKLY" | "MONTHLY";
      readonly targetCount: number;
      readonly completedCount: number;
      readonly localDate: LocalDate;
      readonly timeZone: string;
      readonly paused: boolean;
      readonly currentStreak: number;
    }[];
  }>;
  readonly metrics: TodayWidget<{ readonly metrics: readonly TodayMetricDto[] }>;
}

/** Retrieves the authenticated account's modular Today aggregation. */
export function getToday(signal?: AbortSignal): Promise<TodayResponse> {
  return apiRequest<TodayResponse>("/today", { method: "GET", ...(signal ? { signal } : {}) });
}
