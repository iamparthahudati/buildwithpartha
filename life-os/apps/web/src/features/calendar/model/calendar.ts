import { addLocalDays, formatLocalDate, todayLocalDate, type LocalDate } from "@lib/localDateTime";

export type CalendarView = "day" | "week" | "month";

export type CalendarSourceType = "TIME_BLOCK" | "TASK_DUE" | "MILESTONE" | "HABIT" | "REVIEW";

/** The frontend representation of the LOS-0909 Calendar projection. */
export interface CalendarEvent {
  readonly id: string;
  readonly sourceId: string;
  readonly sourceType: CalendarSourceType;
  readonly title: string;
  readonly startAt?: string | null;
  readonly endAt?: string | null;
  readonly localDate?: LocalDate | null;
  readonly allDay: boolean;
  readonly status: string;
  readonly projectId?: string | null;
  readonly taskId?: string | null;
}

export interface CalendarSourceDefinition {
  readonly type: CalendarSourceType;
  readonly label: string;
  readonly shortLabel: string;
  readonly colorIndex: 1 | 2 | 3 | 4 | 5;
}

export const CALENDAR_SOURCES: readonly CalendarSourceDefinition[] = Object.freeze([
  { type: "TIME_BLOCK", label: "Time Blocks", shortLabel: "Time Block", colorIndex: 1 },
  { type: "TASK_DUE", label: "Due Tasks", shortLabel: "Due Task", colorIndex: 2 },
  { type: "MILESTONE", label: "Milestones", shortLabel: "Milestone", colorIndex: 3 },
  { type: "HABIT", label: "Habits", shortLabel: "Habit", colorIndex: 4 },
  { type: "REVIEW", label: "Reviews", shortLabel: "Review", colorIndex: 5 },
]);

export function calendarSourceDefinition(type: CalendarSourceType): CalendarSourceDefinition {
  return CALENDAR_SOURCES.find((source) => source.type === type) ?? CALENDAR_SOURCES[0]!;
}

export function eventLocalDate(event: CalendarEvent, timeZone: string): LocalDate {
  if (event.localDate) return event.localDate;
  if (event.startAt) return todayLocalDate(timeZone, new Date(event.startAt));
  throw new Error(`Calendar event "${event.id}" has no date.`);
}

export function eventsForDate(
  events: readonly CalendarEvent[],
  date: LocalDate,
  timeZone: string,
): readonly CalendarEvent[] {
  return events.filter((event) => eventLocalDate(event, timeZone) === date);
}

export function sortCalendarEvents(events: readonly CalendarEvent[]): readonly CalendarEvent[] {
  return [...events].sort((left, right) => {
    if (left.allDay !== right.allDay) return left.allDay ? -1 : 1;
    const leftStart = left.startAt ?? "";
    const rightStart = right.startAt ?? "";
    return leftStart.localeCompare(rightStart) || left.title.localeCompare(right.title);
  });
}

export function formatEventTime(event: CalendarEvent, locale: string, timeZone: string): string {
  if (event.allDay) return "All day";
  if (!event.startAt) return "Time not set";

  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  const start = formatter.format(new Date(event.startAt));
  if (!event.endAt) return start;
  return `${start}–${formatter.format(new Date(event.endAt))}`;
}

export function startOfCalendarWeek(date: LocalDate, weekStartsOn: 0 | 1 = 1): LocalDate {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
  const distance = (weekday - weekStartsOn + 7) % 7;
  return addLocalDays(date, -distance);
}

export function calendarWeekDates(date: LocalDate, weekStartsOn: 0 | 1 = 1): readonly LocalDate[] {
  const first = startOfCalendarWeek(date, weekStartsOn);
  return Array.from({ length: 7 }, (_, index) => addLocalDays(first, index));
}

export function calendarMonthDates(date: LocalDate, weekStartsOn: 0 | 1 = 1): readonly LocalDate[] {
  const [year, month] = date.split("-");
  const firstOfMonth = `${year}-${month}-01`;
  const firstVisible = startOfCalendarWeek(firstOfMonth, weekStartsOn);
  return Array.from({ length: 42 }, (_, index) => addLocalDays(firstVisible, index));
}

export function calendarRangeForView(
  date: LocalDate,
  view: CalendarView,
  weekStartsOn: 0 | 1 = 1,
): { readonly startDate: LocalDate; readonly endDate: LocalDate } {
  if (view === "day") return { startDate: date, endDate: date };
  const dates =
    view === "week"
      ? calendarWeekDates(date, weekStartsOn)
      : calendarMonthDates(date, weekStartsOn);
  return { startDate: dates[0]!, endDate: dates.at(-1)! };
}

export function isSameCalendarMonth(left: LocalDate, right: LocalDate): boolean {
  return left.slice(0, 7) === right.slice(0, 7);
}

export function shiftCalendarPeriod(
  date: LocalDate,
  view: CalendarView,
  amount: number,
): LocalDate {
  if (view === "day") return addLocalDays(date, amount);
  if (view === "week") return addLocalDays(date, amount * 7);

  const [year, month, day] = date.split("-").map(Number);
  const targetMonth = new Date(Date.UTC(year!, month! - 1 + amount, 1));
  const lastDay = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return [
    String(targetMonth.getUTCFullYear()).padStart(4, "0"),
    String(targetMonth.getUTCMonth() + 1).padStart(2, "0"),
    String(Math.min(day!, lastDay)).padStart(2, "0"),
  ].join("-");
}

export function formatCalendarPeriod(
  date: LocalDate,
  view: CalendarView,
  locale: string,
  weekStartsOn: 0 | 1 = 1,
): string {
  if (view === "day") return formatLocalDate(date, locale, { dateStyle: "full" });
  if (view === "month") return formatLocalDate(date, locale, { month: "long", year: "numeric" });

  const [first, ...rest] = calendarWeekDates(date, weekStartsOn);
  const last = rest.at(-1)!;
  const firstLabel = formatLocalDate(first!, locale, { month: "short", day: "numeric" });
  if (first!.slice(0, 7) === last.slice(0, 7)) {
    const lastDay = formatLocalDate(last, locale, { day: "numeric" });
    const yearLabel = formatLocalDate(last, locale, { year: "numeric" });
    return `${firstLabel}–${lastDay}, ${yearLabel}`;
  }
  return `${firstLabel}–${formatLocalDate(last, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}
