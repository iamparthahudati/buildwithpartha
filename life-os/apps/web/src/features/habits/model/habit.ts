import type { LocalDate, LocalTime } from "@lib/localDateTime";

export type HabitCadence = "DAILY" | "WEEKLY" | "MONTHLY";

export type HabitColor =
  "blue" | "green" | "amber" | "purple" | "teal" | "red" | "magenta" | "olive";

export interface Habit {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly description?: string | null;
  readonly cadence: HabitCadence;
  readonly targetCount: number;
  readonly timeZone: string;
  readonly color?: HabitColor | null;
  readonly reminderEnabled: boolean;
  readonly reminderTime?: LocalTime | null;
  readonly archived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface HabitEntry {
  readonly id: string;
  readonly habitId: string;
  readonly userId: string;
  readonly localDate: LocalDate;
  readonly completedCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface HabitPausePeriod {
  readonly id: string;
  readonly habitId: string;
  readonly userId: string;
  readonly startDate: LocalDate;
  readonly endDate?: LocalDate | null;
  readonly reason?: string | null;
  readonly createdAt: string;
}

export interface HabitStreakStatistics {
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly eligiblePeriods: number;
  readonly metTargetPeriods: number;
  readonly completionRate: number;
}

export interface HabitStatisticsWindow extends HabitStreakStatistics {
  readonly habitId: string;
  readonly from: LocalDate;
  readonly to: LocalDate;
  readonly totalDays: number;
  readonly daysWithEntry: number;
  readonly daysMeetingTarget: number;
  readonly totalCompletions: number;
  readonly dayCompletionRate: number;
}

export interface HabitHeatmapDay {
  readonly localDate: LocalDate;
  readonly completedCount: number;
  readonly targetCount: number;
  readonly paused?: boolean;
}

export interface HabitFormValues {
  readonly name: string;
  readonly description?: string | null;
  readonly cadence: HabitCadence;
  readonly targetCount: number;
  readonly timeZone: string;
  readonly color?: HabitColor | null;
  readonly reminderEnabled: boolean;
  readonly reminderTime?: LocalTime | null;
  readonly version?: number;
}

export const HABIT_CADENCE_OPTIONS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
] as const;

export const HABIT_COLOR_OPTIONS = [
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "amber", label: "Amber" },
  { value: "purple", label: "Purple" },
  { value: "teal", label: "Teal" },
  { value: "red", label: "Red" },
  { value: "magenta", label: "Magenta" },
  { value: "olive", label: "Olive" },
] as const;

export const DEFAULT_HABIT_TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/Chicago", label: "America/Chicago" },
  { value: "America/Los_Angeles", label: "America/Los Angeles" },
  { value: "America/New_York", label: "America/New York" },
  { value: "Asia/Dubai", label: "Asia/Dubai" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "Europe/London", label: "Europe/London" },
] as const;

export function formatHabitCadence(cadence: HabitCadence): string {
  switch (cadence) {
    case "DAILY":
      return "Daily";
    case "WEEKLY":
      return "Weekly";
    case "MONTHLY":
      return "Monthly";
  }
}

export function formatHabitTarget(habit: Pick<Habit, "cadence" | "targetCount">): string {
  const period = habit.cadence === "DAILY" ? "day" : habit.cadence === "WEEKLY" ? "week" : "month";
  const times = habit.targetCount === 1 ? "time" : "times";
  return `${habit.targetCount} ${times} per ${period}`;
}

export function clampHabitRate(rate: number): number {
  if (!Number.isFinite(rate)) return 0;
  return Math.min(1, Math.max(0, rate));
}

export function formatHabitRate(rate: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(clampHabitRate(rate));
}

export function formatHabitReminderTime(time: LocalTime, locale = "en-US"): string {
  const [hours = "0", minutes = "0"] = time.split(":");
  const value = new Date(Date.UTC(1970, 0, 1, Number(hours), Number(minutes)));
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(value);
}

export function habitHeatmapLevel(day: HabitHeatmapDay): 0 | 1 | 2 | 3 | 4 {
  if (day.paused || day.completedCount <= 0 || day.targetCount <= 0) return 0;
  const ratio = day.completedCount / day.targetCount;
  if (ratio >= 1) return 4;
  if (ratio >= 0.75) return 3;
  if (ratio >= 0.5) return 2;
  return 1;
}

export function habitIsPausedOn(
  pauses: readonly Pick<HabitPausePeriod, "startDate" | "endDate">[],
  date: LocalDate,
): boolean {
  return pauses.some(
    (pause) => pause.startDate <= date && (pause.endDate == null || pause.endDate >= date),
  );
}
