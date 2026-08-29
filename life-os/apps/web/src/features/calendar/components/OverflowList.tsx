import { useEffect, useId, useRef, useState } from "react";

import { Button, Heading } from "@components/ui";

import type { CalendarEvent } from "../model/calendar";
import { EventChip } from "./EventChip";
import "./overflow-list.css";

export interface OverflowListProps {
  readonly dateLabel: string;
  readonly events: readonly CalendarEvent[];
  readonly timeZone: string;
  readonly locale?: string;
  readonly onSelectEvent?: ((event: CalendarEvent) => void) | undefined;
  readonly className?: string;
}

export function OverflowList({
  dateLabel,
  events,
  timeZone,
  locale = "en-US",
  onSelectEvent,
  className,
}: OverflowListProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  if (events.length === 0) return null;

  return (
    <div className={["lifeos-overflow-list", className].filter(Boolean).join(" ")}>
      <Button
        ref={triggerRef}
        size="sm"
        variant="ghost"
        aria-expanded={open}
        aria-controls={panelId}
        className="lifeos-overflow-list__trigger"
        onClick={() => setOpen((current) => !current)}
      >
        {events.length} more
      </Button>
      {open ? (
        <section
          id={panelId}
          aria-label={`More events for ${dateLabel}`}
          className="lifeos-overflow-list__panel"
        >
          <div className="lifeos-overflow-list__header">
            <Heading level={3} size="xs">
              {dateLabel}
            </Heading>
            <Button size="sm" variant="ghost" onClick={close}>
              Close
            </Button>
          </div>
          <ul className="lifeos-overflow-list__events">
            {events.map((event) => (
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
        </section>
      ) : null}
    </div>
  );
}
