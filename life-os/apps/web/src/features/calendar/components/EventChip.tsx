import { CheckCircle2 } from "lucide-react";

import { Icon, Text, TruncatedText } from "@components/ui";

import { calendarSourceDefinition, formatEventTime, type CalendarEvent } from "../model/calendar";
import "./event-chip.css";

export type EventChipDensity = "compact" | "comfortable";

export interface EventChipProps {
  readonly event: CalendarEvent;
  readonly timeZone: string;
  readonly locale?: string;
  readonly density?: EventChipDensity;
  readonly onSelect?: ((event: CalendarEvent) => void) | undefined;
  readonly className?: string;
}

export function EventChip({
  event,
  timeZone,
  locale = "en-US",
  density = "comfortable",
  onSelect,
  className,
}: EventChipProps) {
  const source = calendarSourceDefinition(event.sourceType);
  const timeLabel = formatEventTime(event, locale, timeZone);
  const completed = event.status === "COMPLETED" || event.status === "DONE";
  const label = `${timeLabel}, ${event.title}, ${source.shortLabel}${completed ? ", completed" : ""}`;
  const Element = onSelect ? "button" : "div";

  return (
    <Element
      {...(onSelect ? { type: "button" as const, onClick: () => onSelect(event) } : {})}
      aria-label={label}
      data-source={event.sourceType}
      className={[
        "lifeos-event-chip",
        `lifeos-event-chip--source-${source.colorIndex}`,
        `lifeos-event-chip--${density}`,
        completed && "is-completed",
        onSelect && "is-interactive",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="lifeos-event-chip__source" aria-hidden="true">
        {source.shortLabel}
      </span>
      {density === "comfortable" ? (
        <Text inline size="xs" numeric className="lifeos-event-chip__time">
          {timeLabel}
        </Text>
      ) : null}
      <TruncatedText inline size="xs" lines={1} className="lifeos-event-chip__title">
        {event.title}
      </TruncatedText>
      {completed ? <Icon icon={CheckCircle2} decorative size="sm" /> : null}
    </Element>
  );
}
