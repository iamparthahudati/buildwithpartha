import { Text } from "@components/ui";
import { formatLocalDate, type LocalDate } from "@lib/localDateTime";

import { eventsForDate, type CalendarEvent } from "../model/calendar";
import { EventChip } from "./EventChip";
import { OverflowList } from "./OverflowList";
import "./all-day-lane.css";

export interface AllDayLaneProps {
  readonly dates: readonly LocalDate[];
  readonly events: readonly CalendarEvent[];
  readonly timeZone: string;
  readonly locale?: string;
  readonly maxVisiblePerDay?: number;
  readonly onSelectEvent?: ((event: CalendarEvent) => void) | undefined;
  readonly className?: string;
}

export function AllDayLane({
  dates,
  events,
  timeZone,
  locale = "en-US",
  maxVisiblePerDay = 2,
  onSelectEvent,
  className,
}: AllDayLaneProps) {
  return (
    <section
      aria-label="All-day events"
      className={["lifeos-all-day-lane", className].filter(Boolean).join(" ")}
      style={{ "--lifeos-calendar-columns": dates.length } as React.CSSProperties}
    >
      <Text inline size="xs" weight="semibold" className="lifeos-all-day-lane__label">
        All day
      </Text>
      <div className="lifeos-all-day-lane__days">
        {dates.map((date) => {
          const dateEvents = eventsForDate(events, date, timeZone).filter((event) => event.allDay);
          const visible = dateEvents.slice(0, maxVisiblePerDay);
          const overflow = dateEvents.slice(maxVisiblePerDay);
          const dateLabel = formatLocalDate(date, locale, { dateStyle: "full" });
          return (
            <div key={date} className="lifeos-all-day-lane__day" aria-label={dateLabel}>
              {visible.length === 0 ? (
                <span
                  className="lifeos-all-day-lane__empty"
                  aria-label={`No all-day events for ${dateLabel}`}
                />
              ) : (
                visible.map((event) => (
                  <EventChip
                    key={event.id}
                    event={event}
                    timeZone={timeZone}
                    locale={locale}
                    density="compact"
                    onSelect={onSelectEvent}
                  />
                ))
              )}
              <OverflowList
                dateLabel={dateLabel}
                events={overflow}
                timeZone={timeZone}
                locale={locale}
                onSelectEvent={onSelectEvent}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
