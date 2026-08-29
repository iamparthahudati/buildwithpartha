import { useQuery } from "@tanstack/react-query";

import { queryCalendarEvents, type CalendarQueryParams } from "../api/calendarApi";

export const CALENDAR_QUERY_KEY = ["calendar"] as const;

export function calendarQueryKey(params: CalendarQueryParams) {
  return [...CALENDAR_QUERY_KEY, params] as const;
}

export function useCalendar(params: CalendarQueryParams, enabled = true) {
  return useQuery({
    queryKey: calendarQueryKey(params),
    queryFn: ({ signal }) => queryCalendarEvents(params, signal),
    enabled,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}
