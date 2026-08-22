import type { LocalDate } from "@lib/localDateTime";

export interface TodaySprintData {
  readonly sprintId: string;
  readonly name: string;
  readonly startDate: LocalDate;
  readonly endDate: LocalDate;
  readonly completedStoryPoints: number;
  readonly totalStoryPoints: number;
}

export type TodaySprintState =
  | { readonly type: "loading" }
  | { readonly type: "empty" }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "ready"; readonly sprint: TodaySprintData };

export interface TodayWeekDay {
  readonly localDate: LocalDate;
  readonly completedTasksCount: number;
  readonly totalTasksCount: number;
  readonly isToday?: boolean;
}

export interface TodayWeeklyGoal {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

export interface TodayWeekData {
  readonly startDate: LocalDate;
  readonly endDate: LocalDate;
  readonly days: readonly TodayWeekDay[];
  readonly goals: readonly TodayWeeklyGoal[];
  readonly plannedMinutes: number;
  readonly capacityMinutes: number;
}

export type TodayWeekState =
  | { readonly type: "loading" }
  | { readonly type: "empty" }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "ready"; readonly week: TodayWeekData };
