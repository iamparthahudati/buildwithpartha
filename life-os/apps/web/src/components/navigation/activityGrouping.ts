import { addLocalDays, formatLocalDate, todayLocalDate, type LocalDate } from "@lib/localDateTime";

import type { ActivityEvent } from "./ActivityFeed";

/**
 * Pure day-grouping for `ActivityFeed` (LOS-0433), paired with its component
 * the same way `paginationRange.ts`/`breadcrumbsCollapse.ts` pair with
 * theirs.
 *
 * `todayLocalDate` (LOS-0318) already answers "what calendar date is it for
 * someone in this timezone" for an arbitrary `Date`, not only for the real
 * current moment — passing each event's own `createdAt` through it is what
 * turns an instant into the calendar day it actually falls on in the
 * viewer's zone, the same conversion a UTC-stored timestamp always needs
 * before it can be grouped by day at all.
 */

export interface ActivityEventGroup {
  readonly date: LocalDate;
  readonly label: string;
  readonly events: readonly ActivityEvent[];
}

/**
 * Groups events by calendar day, preserving the caller's own ordering
 * within and across groups — this never sorts, the same "caller supplies
 * the order" split `Timeline`'s `entries` already assumes.
 */
export function groupActivityEventsByDay(
  events: readonly ActivityEvent[],
  timeZone: string,
  locale: string,
  now: Date,
): readonly ActivityEventGroup[] {
  const today = todayLocalDate(timeZone, now);
  const yesterday = addLocalDays(today, -1);
  const eventsByDate = new Map<LocalDate, ActivityEvent[]>();

  for (const event of events) {
    const date = todayLocalDate(timeZone, new Date(event.createdAt));
    const existing = eventsByDate.get(date);
    if (existing) {
      existing.push(event);
    } else {
      eventsByDate.set(date, [event]);
    }
  }

  return Array.from(eventsByDate.entries()).map(([date, dateEvents]) => ({
    date,
    label: activityDayLabel(date, today, yesterday, locale),
    events: dateEvents,
  }));
}

function activityDayLabel(
  date: LocalDate,
  today: LocalDate,
  yesterday: LocalDate,
  locale: string,
): string {
  if (date === today) {
    return "Today";
  }
  if (date === yesterday) {
    return "Yesterday";
  }
  return formatLocalDate(date, locale);
}
