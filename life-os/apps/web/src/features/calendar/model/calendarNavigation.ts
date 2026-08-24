import type { LocalDate } from "@lib/localDateTime";

import { eventLocalDate, type CalendarEvent } from "./calendar";

function withReturnTo(path: string, returnTo?: string): string {
  if (!returnTo) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}

/** Resolves an aggregate Calendar projection to its canonical owned record. */
export function calendarEventHref(
  event: CalendarEvent,
  timeZone: string,
  returnTo?: string,
): string {
  switch (event.sourceType) {
    case "TIME_BLOCK": {
      const params = new URLSearchParams({
        date: eventLocalDate(event, timeZone),
        selected: event.sourceId,
      });
      if (returnTo) params.set("returnTo", returnTo);
      return `/life-os/app/time-blocks?${params.toString()}`;
    }
    case "TASK_DUE":
      return withReturnTo(`/life-os/app/tasks/${event.sourceId}`, returnTo);
    case "MILESTONE": {
      if (!event.projectId) return withReturnTo("/life-os/app/projects", returnTo);
      const params = new URLSearchParams({ tab: "timeline", milestone: event.sourceId });
      if (returnTo) params.set("returnTo", returnTo);
      return `/life-os/app/projects/${event.projectId}?${params.toString()}`;
    }
    case "HABIT":
      return withReturnTo(`/life-os/app/habits/${event.sourceId}`, returnTo);
    case "REVIEW": {
      const date: LocalDate = eventLocalDate(event, timeZone);
      return withReturnTo(`/life-os/app/reviews/daily/${date}`, returnTo);
    }
  }
}
