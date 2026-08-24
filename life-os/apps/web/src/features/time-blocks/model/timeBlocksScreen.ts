import { addLocalDays, formatLocalDate, type LocalDate } from "@lib/localDateTime";
import type { TimeBlock } from "./timeBlock";

export type TimeBlocksViewMode = "day" | "week";

export interface TimeBlocksDateNavigation {
  readonly currentDate: LocalDate;
  readonly isToday: boolean;
  readonly dateLabel: string;
  readonly weekLabel: string;
  readonly weekDays: readonly LocalDate[];
}

export function formatTimeBlocksDateLabel(date: LocalDate, locale: string = "en-US"): string {
  return formatLocalDate(date, locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTimeBlocksWeekLabel(startDate: LocalDate, locale: string = "en-US"): string {
  const endDate = addLocalDays(startDate, 6);
  const startStr = formatLocalDate(startDate, locale, { month: "short", day: "numeric" });
  const endStr = formatLocalDate(endDate, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Week of ${startStr} – ${endStr}`;
}

export function getWeekDaysForDate(startDate: LocalDate): readonly LocalDate[] {
  const days: LocalDate[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addLocalDays(startDate, i));
  }
  return days;
}

export function filterBlocksByDate(
  blocks: readonly TimeBlock[],
  date: LocalDate,
): readonly TimeBlock[] {
  return blocks.filter((b) => !b.date || b.date === date);
}

export function computeDayTimeBlockCounts(blocks: readonly TimeBlock[]) {
  const total = blocks.length;
  const completed = blocks.filter((b) => b.status === "COMPLETED" || b.completed).length;
  const inProgress = blocks.filter((b) => b.status === "IN_PROGRESS" || b.isCurrent).length;
  const scheduled = blocks.filter(
    (b) => b.status === "SCHEDULED" && !b.completed && !b.isCurrent,
  ).length;
  const conflict = blocks.filter((b) => Boolean(b.hasConflict)).length;

  return { total, completed, inProgress, scheduled, conflict };
}
