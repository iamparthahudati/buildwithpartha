import { Heading, Text } from "@components/ui";
import { formatLocalDate, type LocalDate } from "@lib/localDateTime";

import { eventsForDate, sortCalendarEvents, type CalendarEvent } from "../model/calendar";
import { EventChip } from "./EventChip";
import "./calendar-list-alternative.css";

export interface CalendarListAlternativeProps {
  readonly dates: readonly LocalDate[];
  readonly events: readonly CalendarEvent[];
  readonly timeZone: string;
  readonly locale?: string;
  readonly onSelectEvent?: ((event: CalendarEvent) => void) | undefined;
  readonly className?: string;
}

export function CalendarListAlternative({
  dates,
  events,
  timeZone,
  locale = "en-US",
  onSelectEvent,
  className,
}: CalendarListAlternativeProps) {
  const populatedDates = dates
    .map((date) => ({ date, events: sortCalendarEvents(eventsForDate(events, date, timeZone)) }))
    .filter((group) => group.events.length > 0);

  return (
    <section
      aria-label="Calendar list"
      className={["lifeos-calendar-list", className].filter(Boolean).join(" ")}
    >
      {populatedDates.length === 0 ? (
        <div className="lifeos-calendar-list__empty">
          <Heading level={3} size="sm">
            No Calendar items
          </Heading>
          <Text size="sm" tone="secondary">
            Time Blocks, due Tasks, milestones, Habits and Reviews will appear here.
          </Text>
        </div>
      ) : (
        <ol className="lifeos-calendar-list__groups">
          {populatedDates.map((group) => (
            <li key={group.date} className="lifeos-calendar-list__group">
              <Heading level={3} size="xs">
                <time dateTime={group.date}>
                  {formatLocalDate(group.date, locale, { dateStyle: "full" })}
                </time>
              </Heading>
              <ul className="lifeos-calendar-list__events">
                {group.events.map((event) => (
                  <li key={event.id}>
                    <EventChip
                      event={event}
                      timeZone={timeZone}
                      locale={locale}
                      onSelect={onSelectEvent}
                    />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
