import { useRef } from "react";

import { Badge, Skeleton, Text } from "@components/ui";
import { formatLocalDate, type LocalDate } from "@lib/localDateTime";

import {
  calendarWeekDates,
  eventsForDate,
  sortCalendarEvents,
  type CalendarEvent,
} from "../model/calendar";
import { AllDayLane } from "./AllDayLane";
import { CalendarListAlternative } from "./CalendarListAlternative";
import { EventChip } from "./EventChip";
import { OverflowList } from "./OverflowList";
import "./week-calendar-grid.css";

export interface WeekCalendarGridProps {
  readonly date: LocalDate;
  readonly today: LocalDate;
  readonly selectedDate?: LocalDate;
  readonly events: readonly CalendarEvent[];
  readonly timeZone: string;
  readonly locale?: string;
  readonly weekStartsOn?: 0 | 1;
  readonly loading?: boolean;
  readonly maxVisiblePerDay?: number;
  readonly onSelectDate?: ((date: LocalDate) => void) | undefined;
  readonly onSelectEvent?: ((event: CalendarEvent) => void) | undefined;
  readonly className?: string;
}

export function WeekCalendarGrid({
  date,
  today,
  selectedDate = date,
  events,
  timeZone,
  locale = "en-US",
  weekStartsOn = 1,
  loading = false,
  maxVisiblePerDay = 5,
  onSelectDate,
  onSelectEvent,
  className,
}: WeekCalendarGridProps) {
  const dates = calendarWeekDates(date, weekStartsOn);
  const dateRefs = useRef(new Map<LocalDate, HTMLButtonElement>());

  if (loading) {
    return (
      <section
        className="lifeos-week-calendar-grid"
        aria-label="Loading week Calendar"
        aria-busy="true"
      >
        <Skeleton shape="block" width="100%" height="24rem" />
      </section>
    );
  }

  const moveDateFocus = (from: LocalDate, delta: number) => {
    const currentIndex = dates.indexOf(from);
    const nextDate = dates[Math.max(0, Math.min(dates.length - 1, currentIndex + delta))];
    if (!nextDate) return;
    onSelectDate?.(nextDate);
    dateRefs.current.get(nextDate)?.focus();
  };

  return (
    <section
      aria-label="Week Calendar"
      className={["lifeos-week-calendar-grid", className].filter(Boolean).join(" ")}
    >
      <div className="lifeos-week-calendar-grid__visual">
        <div className="lifeos-week-calendar-grid__scroll">
          <div className="lifeos-week-calendar-grid__date-headers">
            <span aria-hidden="true" />
            {dates.map((day) => {
              const fullDate = formatLocalDate(day, locale, { dateStyle: "full" });
              return (
                <button
                  key={day}
                  ref={(node) => {
                    if (node) dateRefs.current.set(day, node);
                    else dateRefs.current.delete(day);
                  }}
                  type="button"
                  className={[
                    "lifeos-week-calendar-grid__date-button",
                    day === selectedDate && "is-selected",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={day === selectedDate}
                  {...(day === today ? { "aria-current": "date" as const } : {})}
                  onClick={() => onSelectDate?.(day)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      moveDateFocus(day, 1);
                    } else if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      moveDateFocus(day, -1);
                    } else if (event.key === "Home") {
                      event.preventDefault();
                      moveDateFocus(day, -dates.length);
                    } else if (event.key === "End") {
                      event.preventDefault();
                      moveDateFocus(day, dates.length);
                    }
                  }}
                  aria-label={`Select ${fullDate}`}
                >
                  <Text inline size="xs" tone="secondary">
                    {formatLocalDate(day, locale, { weekday: "short" })}
                  </Text>
                  <Text inline size="lg" weight="semibold" numeric>
                    {formatLocalDate(day, locale, { day: "numeric" })}
                  </Text>
                  {day === today ? <Badge tone="primary">Today</Badge> : null}
                </button>
              );
            })}
          </div>
          <AllDayLane
            dates={dates}
            events={events}
            timeZone={timeZone}
            locale={locale}
            onSelectEvent={onSelectEvent}
          />
          <div className="lifeos-week-calendar-grid__columns">
            <Text
              inline
              size="xs"
              tone="secondary"
              className="lifeos-week-calendar-grid__time-label"
            >
              Timed
            </Text>
            {dates.map((day) => {
              const dayEvents = sortCalendarEvents(eventsForDate(events, day, timeZone)).filter(
                (event) => !event.allDay,
              );
              const dateLabel = formatLocalDate(day, locale, { dateStyle: "full" });
              return (
                <div
                  key={day}
                  className="lifeos-week-calendar-grid__column"
                  aria-label={`${dateLabel} timed events`}
                >
                  {dayEvents.slice(0, maxVisiblePerDay).map((event) => (
                    <EventChip
                      key={event.id}
                      event={event}
                      timeZone={timeZone}
                      locale={locale}
                      onSelect={onSelectEvent}
                    />
                  ))}
                  {dayEvents.length === 0 ? (
                    <Text size="xs" tone="muted" className="lifeos-week-calendar-grid__empty">
                      No timed items
                    </Text>
                  ) : null}
                  <OverflowList
                    dateLabel={dateLabel}
                    events={dayEvents.slice(maxVisiblePerDay)}
                    timeZone={timeZone}
                    locale={locale}
                    onSelectEvent={onSelectEvent}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <CalendarListAlternative
        dates={dates}
        events={events}
        timeZone={timeZone}
        locale={locale}
        onSelectEvent={onSelectEvent}
        className="lifeos-week-calendar-grid__mobile-list"
      />
    </section>
  );
}
