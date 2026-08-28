import { useMemo } from "react";
import { useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";

import type { AppShellOutletContext } from "@components/layout";
import {
  CALENDAR_SOURCES,
  CalendarScreen,
  calendarEventHref,
  calendarRangeForView,
  useCalendar,
  useCalendarOnlineStatus,
  type CalendarEvent,
  type CalendarQueryParams,
  type CalendarSourceType,
  type CalendarView,
} from "@features/calendar";
import { isLocalDate, todayLocalDate, type LocalDate } from "@lib/localDateTime";
import { useAuthSession } from "@state/authSession";

const SOURCE_ORDER = CALENDAR_SOURCES.map((source) => source.type);
const SOURCE_SET = new Set<CalendarSourceType>(SOURCE_ORDER);

function readView(value: string | null): CalendarView {
  return value === "day" || value === "week" || value === "month" ? value : "month";
}

function readSources(searchParams: URLSearchParams): readonly CalendarSourceType[] {
  const values = searchParams
    .getAll("source")
    .flatMap((value) => value.split(","))
    .filter((value): value is CalendarSourceType => SOURCE_SET.has(value as CalendarSourceType));
  if (values.length === 0 && !searchParams.has("source")) return SOURCE_ORDER;
  const selected = new Set(values);
  return SOURCE_ORDER.filter((source) => selected.has(source));
}

export function CalendarRoute() {
  const { user } = useAuthSession();
  const { onQuickAddClick } = useOutletContext<AppShellOutletContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const online = useCalendarOnlineStatus();

  const timeZone = user?.timeZone ?? "UTC";
  const locale = user?.locale ?? "en-US";
  const weekStartsOn: 0 | 1 = user?.weekStart === 0 ? 0 : 1;
  const today = todayLocalDate(timeZone);
  const dateValue = searchParams.get("date");
  const date: LocalDate = dateValue && isLocalDate(dateValue) ? dateValue : today;
  const view = readView(searchParams.get("view"));
  const sources = useMemo(() => readSources(searchParams), [searchParams]);
  const selectedSources = useMemo(() => new Set(sources), [sources]);
  const range = useMemo(
    () => calendarRangeForView(date, view, weekStartsOn),
    [date, view, weekStartsOn],
  );
  const queryParams: CalendarQueryParams = useMemo(
    () => ({ ...range, timeZone, sources }),
    [range, sources, timeZone],
  );
  const calendarQuery = useCalendar(
    queryParams,
    user !== null && online && selectedSources.size > 0,
  );

  if (user === null) return null;

  const updateSearch = (update: (next: URLSearchParams) => void) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        update(next);
        return next;
      },
      { replace: true },
    );
  };

  const handleDateChange = (nextDate: LocalDate) => {
    updateSearch((next) => next.set("date", nextDate));
  };

  const handleViewChange = (nextView: CalendarView) => {
    updateSearch((next) => {
      if (nextView === "month") next.delete("view");
      else next.set("view", nextView);
    });
  };

  const handleSourcesChange = (nextSources: ReadonlySet<CalendarSourceType>) => {
    updateSearch((next) => {
      next.delete("source");
      const ordered = SOURCE_ORDER.filter((source) => nextSources.has(source));
      if (ordered.length === SOURCE_ORDER.length) return;
      if (ordered.length === 0) {
        next.append("source", "");
        return;
      }
      ordered.forEach((source) => next.append("source", source));
    });
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    const returnTo = `${location.pathname}${location.search}`;
    navigate(calendarEventHref(event, timeZone, returnTo));
  };

  return (
    <CalendarScreen
      date={date}
      today={today}
      view={view}
      selectedSources={selectedSources}
      events={calendarQuery.data?.events ?? []}
      timeZone={timeZone}
      locale={locale}
      weekStartsOn={weekStartsOn}
      loading={calendarQuery.isPending && calendarQuery.data === undefined && online}
      refreshing={calendarQuery.isFetching && calendarQuery.data !== undefined}
      offline={!online}
      error={
        calendarQuery.isError || (!online && calendarQuery.data === undefined)
          ? "Calendar couldn't load."
          : null
      }
      truncated={calendarQuery.data?.truncated ?? false}
      onDateChange={handleDateChange}
      onViewChange={handleViewChange}
      onSourcesChange={handleSourcesChange}
      onSelectEvent={handleSelectEvent}
      onAddTimeBlock={() => onQuickAddClick("time-block")}
      onRetry={() => void calendarQuery.refetch()}
    />
  );
}
