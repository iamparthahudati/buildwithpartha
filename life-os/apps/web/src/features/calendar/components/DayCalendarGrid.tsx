import { Heading, Skeleton, Text } from "@components/ui";
import { formatLocalDate, type LocalDate } from "@lib/localDateTime";

import { eventsForDate, sortCalendarEvents, type CalendarEvent } from "../model/calendar";
import { AllDayLane } from "./AllDayLane";
import { EventChip } from "./EventChip";
import "./day-calendar-grid.css";

export interface DayCalendarGridProps {
  readonly date: LocalDate;
  readonly events: readonly CalendarEvent[];
  readonly timeZone: string;
  readonly locale?: string;
  readonly loading?: boolean;
  readonly startHour?: number;
  readonly endHour?: number;
  readonly onSelectEvent?: ((event: CalendarEvent) => void) | undefined;
  readonly className?: string;
}

function eventHour(event: CalendarEvent, timeZone: string): number {
  if (!event.startAt) return 0;
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(new Date(event.startAt));
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0);
}

export function DayCalendarGrid({
  date,
  events,
  timeZone,
  locale = "en-US",
  loading = false,
  startHour = 0,
  endHour = 24,
  onSelectEvent,
  className,
}: DayCalendarGridProps) {
  const dateLabel = formatLocalDate(date, locale, { dateStyle: "full" });
  const dateEvents = sortCalendarEvents(eventsForDate(events, date, timeZone));
  const allDayEvents = dateEvents.filter((event) => event.allDay);
  const timedEvents = dateEvents.filter((event) => !event.allDay);
  const hours = Array.from(
    { length: Math.max(0, endHour - startHour) },
    (_, index) => startHour + index,
  );
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: "numeric", timeZone: "UTC" });

  if (loading) {
    return (
      <section
        className="lifeos-day-calendar-grid"
        aria-label="Loading day Calendar"
        aria-busy="true"
      >
        <Skeleton shape="line" width="12rem" />
        <Skeleton shape="block" width="100%" height="24rem" />
      </section>
    );
  }

  return (
    <section
      aria-label={`Calendar for ${dateLabel}`}
      className={["lifeos-day-calendar-grid", className].filter(Boolean).join(" ")}
    >
      <Heading level={3} size="sm" className="lifeos-day-calendar-grid__title">
        <time dateTime={date}>{dateLabel}</time>
      </Heading>
      <AllDayLane
        dates={[date]}
        events={allDayEvents}
        timeZone={timeZone}
        locale={locale}
        onSelectEvent={onSelectEvent}
      />
      <div className="lifeos-day-calendar-grid__hours">
        {hours.map((hour) => {
          const hourEvents = timedEvents.filter((event) => eventHour(event, timeZone) === hour);
          const hourLabel = timeFormatter.format(new Date(Date.UTC(2000, 0, 1, hour)));
          return (
            <div key={hour} className="lifeos-day-calendar-grid__hour">
              <time
                className="lifeos-day-calendar-grid__hour-label"
                dateTime={`${String(hour).padStart(2, "0")}:00`}
              >
                {hourLabel}
              </time>
              <div
                className="lifeos-day-calendar-grid__hour-events"
                aria-label={`${hourLabel} events`}
              >
                {hourEvents.length === 0 ? (
                  <span className="lifeos-day-calendar-grid__gap" aria-hidden="true" />
                ) : (
                  hourEvents.map((event) => (
                    <EventChip
                      key={event.id}
                      event={event}
                      timeZone={timeZone}
                      locale={locale}
                      onSelect={onSelectEvent}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      {dateEvents.length === 0 ? (
        <Text size="sm" tone="secondary" className="lifeos-day-calendar-grid__empty">
          No Calendar items for this day.
        </Text>
      ) : null}
    </section>
  );
}
