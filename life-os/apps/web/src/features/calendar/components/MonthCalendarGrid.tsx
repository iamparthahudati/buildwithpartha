import { useRef } from "react";

import { Badge, Skeleton, Text } from "@components/ui";
import { addLocalDays, formatLocalDate, type LocalDate } from "@lib/localDateTime";

import {
  calendarMonthDates,
  eventsForDate,
  isSameCalendarMonth,
  sortCalendarEvents,
  type CalendarEvent,
} from "../model/calendar";
import { CalendarListAlternative } from "./CalendarListAlternative";
import { EventChip } from "./EventChip";
import { OverflowList } from "./OverflowList";
import "./month-calendar-grid.css";

export interface MonthCalendarGridProps {
  readonly month: LocalDate;
  readonly today: LocalDate;
  readonly selectedDate: LocalDate;
  readonly events: readonly CalendarEvent[];
  readonly timeZone: string;
  readonly locale?: string;
  readonly weekStartsOn?: 0 | 1;
  readonly loading?: boolean;
  readonly maxVisiblePerDay?: number;
  readonly onSelectDate: (date: LocalDate) => void;
  readonly onSelectEvent?: ((event: CalendarEvent) => void) | undefined;
  readonly className?: string;
}

export function MonthCalendarGrid({
  month,
  today,
  selectedDate,
  events,
  timeZone,
  locale = "en-US",
  weekStartsOn = 1,
  loading = false,
  maxVisiblePerDay = 3,
  onSelectDate,
  onSelectEvent,
  className,
}: MonthCalendarGridProps) {
  const dates = calendarMonthDates(month, weekStartsOn);
  const dateRefs = useRef(new Map<LocalDate, HTMLButtonElement>());
  const weekdayLabels = dates
    .slice(0, 7)
    .map((date) => formatLocalDate(date, locale, { weekday: "short" }));

  if (loading) {
    return (
      <section
        className="lifeos-month-calendar-grid"
        aria-label="Loading month Calendar"
        aria-busy="true"
      >
        <Skeleton shape="block" width="100%" height="32rem" />
      </section>
    );
  }

  const selectAndFocus = (nextDate: LocalDate) => {
    onSelectDate(nextDate);
    dateRefs.current.get(nextDate)?.focus();
  };

  const handleDateKeyDown = (event: React.KeyboardEvent, date: LocalDate) => {
    const delta =
      event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowLeft"
          ? -1
          : event.key === "ArrowDown"
            ? 7
            : event.key === "ArrowUp"
              ? -7
              : event.key === "Home"
                ? -dates.indexOf(date)
                : event.key === "End"
                  ? dates.length - 1 - dates.indexOf(date)
                  : 0;
    if (delta === 0) return;
    event.preventDefault();
    const nextDate = addLocalDays(date, delta);
    if (dates.includes(nextDate)) selectAndFocus(nextDate);
  };

  return (
    <section
      aria-label={formatLocalDate(month, locale, { month: "long", year: "numeric" })}
      className={["lifeos-month-calendar-grid", className].filter(Boolean).join(" ")}
    >
      <div className="lifeos-month-calendar-grid__visual">
        <table className="lifeos-month-calendar-grid__table">
          <caption className="lifeos-month-calendar-grid__caption">
            Use arrow keys to move between dates. Select a Calendar item to open its source.
          </caption>
          <thead>
            <tr>
              {weekdayLabels.map((weekday, index) => (
                <th key={`${weekday}-${index}`} scope="col">
                  {weekday}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, weekIndex) => (
              <tr key={weekIndex}>
                {dates.slice(weekIndex * 7, weekIndex * 7 + 7).map((date) => {
                  const dateEvents = sortCalendarEvents(eventsForDate(events, date, timeZone));
                  const dateLabel = formatLocalDate(date, locale, { dateStyle: "full" });
                  const isToday = date === today;
                  const outsideMonth = !isSameCalendarMonth(date, month);
                  return (
                    <td
                      key={date}
                      className={[
                        date === selectedDate && "is-selected",
                        outsideMonth && "is-outside-month",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <button
                        ref={(node) => {
                          if (node) dateRefs.current.set(date, node);
                          else dateRefs.current.delete(date);
                        }}
                        type="button"
                        tabIndex={date === selectedDate ? 0 : -1}
                        className="lifeos-month-calendar-grid__date"
                        aria-label={`Select ${dateLabel}, ${dateEvents.length} ${dateEvents.length === 1 ? "item" : "items"}`}
                        aria-pressed={date === selectedDate}
                        {...(isToday ? { "aria-current": "date" as const } : {})}
                        onClick={() => onSelectDate(date)}
                        onKeyDown={(event) => handleDateKeyDown(event, date)}
                      >
                        <time dateTime={date}>
                          {formatLocalDate(date, locale, { day: "numeric" })}
                        </time>
                        {isToday ? <Badge tone="primary">Today</Badge> : null}
                      </button>
                      <div className="lifeos-month-calendar-grid__events">
                        {dateEvents.slice(0, maxVisiblePerDay).map((calendarEvent) => (
                          <EventChip
                            key={calendarEvent.id}
                            event={calendarEvent}
                            timeZone={timeZone}
                            locale={locale}
                            density="compact"
                            onSelect={onSelectEvent}
                          />
                        ))}
                        <OverflowList
                          dateLabel={dateLabel}
                          events={dateEvents.slice(maxVisiblePerDay)}
                          timeZone={timeZone}
                          locale={locale}
                          onSelectEvent={onSelectEvent}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lifeos-month-calendar-grid__selected-agenda">
        <Text size="sm" weight="semibold">
          Selected date: {formatLocalDate(selectedDate, locale, { dateStyle: "full" })}
        </Text>
        <CalendarListAlternative
          dates={[selectedDate]}
          events={events}
          timeZone={timeZone}
          locale={locale}
          onSelectEvent={onSelectEvent}
        />
      </div>
    </section>
  );
}
