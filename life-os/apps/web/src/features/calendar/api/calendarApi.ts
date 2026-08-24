import { apiRequest } from "@lib/apiClient";
import type { LocalDate } from "@lib/localDateTime";

import type { CalendarEvent, CalendarSourceType } from "../model/calendar";

export interface CalendarQueryParams {
  readonly startDate: LocalDate;
  readonly endDate: LocalDate;
  readonly timeZone: string;
  readonly sources: readonly CalendarSourceType[];
  readonly limit?: number;
}

export interface CalendarResponse {
  readonly startDate: LocalDate;
  readonly endDate: LocalDate;
  readonly timeZone: string;
  readonly sources: readonly CalendarSourceType[];
  readonly events: readonly CalendarEvent[];
  readonly limit: number;
  readonly truncated: boolean;
}

/** Retrieves the bounded, owner-scoped Calendar aggregate for a local-date range. */
export function queryCalendarEvents(
  params: CalendarQueryParams,
  signal?: AbortSignal,
): Promise<CalendarResponse> {
  const search = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    timeZone: params.timeZone,
  });
  params.sources.forEach((source) => search.append("source", source));
  if (params.limit !== undefined) search.set("limit", String(params.limit));

  return apiRequest<CalendarResponse>(`/calendar/events?${search.toString()}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
}
