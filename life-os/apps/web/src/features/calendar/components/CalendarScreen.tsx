import { useMemo } from "react";

import { Alert, EmptyState, ErrorState } from "@components/feedback";
import { PageHeader } from "@components/navigation";
import { Text } from "@components/ui";
import type { LocalDate } from "@lib/localDateTime";

import {
  CALENDAR_SOURCES,
  type CalendarEvent,
  type CalendarSourceType,
  type CalendarView,
} from "../model/calendar";
import { CalendarFilterLegend } from "./CalendarFilterLegend";
import { CalendarHeader } from "./CalendarHeader";
import { DayCalendarGrid } from "./DayCalendarGrid";
import { MonthCalendarGrid } from "./MonthCalendarGrid";
import { WeekCalendarGrid } from "./WeekCalendarGrid";
import "./calendar-screen.css";

export interface CalendarScreenProps {
  readonly date: LocalDate;
  readonly today: LocalDate;
  readonly view: CalendarView;
  readonly selectedSources: ReadonlySet<CalendarSourceType>;
  readonly events?: readonly CalendarEvent[];
  readonly timeZone: string;
  readonly locale?: string;
  readonly weekStartsOn?: 0 | 1;
  readonly loading?: boolean;
  readonly refreshing?: boolean;
  readonly offline?: boolean;
  readonly error?: string | null;
  readonly truncated?: boolean;
  readonly onDateChange: (date: LocalDate) => void;
  readonly onViewChange: (view: CalendarView) => void;
  readonly onSourcesChange: (sources: ReadonlySet<CalendarSourceType>) => void;
  readonly onSelectEvent: (event: CalendarEvent) => void;
  readonly onAddTimeBlock?: () => void;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export function CalendarScreen({
  date,
  today,
  view,
  selectedSources,
  events = [],
  timeZone,
  locale = "en-US",
  weekStartsOn = 1,
  loading = false,
  refreshing = false,
  offline = false,
  error = null,
  truncated = false,
  onDateChange,
  onViewChange,
  onSourcesChange,
  onSelectEvent,
  onAddTimeBlock,
  onRetry,
  className,
}: CalendarScreenProps) {
  const visibleEvents = useMemo(
    () => events.filter((event) => selectedSources.has(event.sourceType)),
    [events, selectedSources],
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        CALENDAR_SOURCES.map((source) => [
          source.type,
          visibleEvents.filter((event) => event.sourceType === source.type).length,
        ]),
      ) as Record<CalendarSourceType, number>,
    [visibleEvents],
  );
  const noSources = selectedSources.size === 0;
  const showPageError = Boolean(error) && visibleEvents.length === 0 && !loading;
  const sharedGridProps = {
    events: visibleEvents,
    timeZone,
    locale,
    loading,
    onSelectEvent,
  } as const;

  return (
    <main className={["lifeos-calendar-screen", className].filter(Boolean).join(" ")}>
      <PageHeader
        title="Calendar"
        description="See scheduled work and important dates together in your local timezone."
      />

      <CalendarHeader
        date={date}
        today={today}
        view={view}
        locale={locale}
        weekStartsOn={weekStartsOn}
        onDateChange={onDateChange}
        onViewChange={onViewChange}
        {...(onAddTimeBlock ? { onAdd: onAddTimeBlock } : {})}
      />

      {offline ? (
        <Alert tone="warning" heading="You're offline">
          Showing the last Calendar items available on this device. Reconnect to refresh them.
        </Alert>
      ) : null}
      {truncated ? (
        <Alert tone="warning" heading="Some Calendar items aren't shown">
          This range reached the 500-item display limit. Choose a shorter range or fewer sources.
        </Alert>
      ) : null}
      {error && visibleEvents.length > 0 ? (
        <ErrorState
          scope="region"
          title="Calendar couldn't refresh"
          description="The previously loaded Calendar items are still shown."
          {...(onRetry ? { onRetry } : {})}
        />
      ) : null}

      <CalendarFilterLegend
        selected={selectedSources}
        counts={counts}
        disabled={loading}
        onChange={onSourcesChange}
      />

      {refreshing && !loading ? (
        <div role="status">
          <Text size="xs" tone="secondary">
            Refreshing Calendar…
          </Text>
        </div>
      ) : null}

      {noSources ? (
        <EmptyState
          variant="filtered"
          title="No Calendar sources selected"
          description="Choose at least one source to show its items."
          titleLevel={2}
        />
      ) : showPageError ? (
        <ErrorState
          scope="page"
          title="Calendar couldn't load"
          description={
            offline
              ? "No saved Calendar items are available on this device. Reconnect and try again."
              : "Your Calendar items haven't changed. Try again when you're connected."
          }
          {...(onRetry ? { onRetry } : {})}
        />
      ) : (
        <>
          {!loading && visibleEvents.length === 0 ? (
            <EmptyState
              variant="filtered"
              title="No Calendar items in this range"
              description="Try another date or include more Calendar sources."
            />
          ) : null}
          {view === "day" ? (
            <DayCalendarGrid date={date} {...sharedGridProps} />
          ) : view === "week" ? (
            <WeekCalendarGrid
              date={date}
              today={today}
              selectedDate={date}
              weekStartsOn={weekStartsOn}
              onSelectDate={onDateChange}
              {...sharedGridProps}
            />
          ) : (
            <MonthCalendarGrid
              month={date}
              today={today}
              selectedDate={date}
              weekStartsOn={weekStartsOn}
              onSelectDate={onDateChange}
              {...sharedGridProps}
            />
          )}
        </>
      )}
    </main>
  );
}
