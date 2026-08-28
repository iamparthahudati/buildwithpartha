import { useState } from "react";

import {
  CALENDAR_SOURCES,
  CalendarFilterLegend,
  CalendarHeader,
  CalendarListAlternative,
  DayCalendarGrid,
  EventChip,
  MonthCalendarGrid,
  OverflowList,
  WeekCalendarGrid,
  type CalendarEvent,
  type CalendarSourceType,
  type CalendarView,
} from "@features/calendar";
import type { LocalDate } from "@lib/localDateTime";

const CALENDAR_EVENTS: readonly CalendarEvent[] = [
  {
    id: "milestone:catalog",
    sourceId: "catalog-milestone",
    sourceType: "MILESTONE",
    title: "Calendar primitive review",
    localDate: "2026-08-24",
    allDay: true,
    status: "OPEN",
  },
  {
    id: "time-block:catalog",
    sourceId: "catalog-time-block",
    sourceType: "TIME_BLOCK",
    title: "Focused implementation",
    startAt: "2026-08-24T09:00:00Z",
    endAt: "2026-08-24T10:30:00Z",
    allDay: false,
    status: "SCHEDULED",
  },
  {
    id: "task-due:catalog",
    sourceId: "catalog-task",
    sourceType: "TASK_DUE",
    title: "Run the frontend quality gate",
    startAt: "2026-08-24T13:00:00Z",
    allDay: false,
    status: "TODO",
  },
  {
    id: "review:catalog",
    sourceId: "catalog-review",
    sourceType: "REVIEW",
    title: "Daily Review",
    localDate: "2026-08-25",
    allDay: true,
    status: "OPEN",
  },
];

export function CalendarHeaderDemo() {
  const [date, setDate] = useState<LocalDate>("2026-08-24");
  const [view, setView] = useState<CalendarView>("month");
  return (
    <CalendarHeader
      date={date}
      today="2026-08-24"
      view={view}
      onDateChange={setDate}
      onViewChange={setView}
      onAdd={() => undefined}
    />
  );
}

export function CalendarEventDemo() {
  return (
    <div className="specimen-stack">
      {CALENDAR_EVENTS.map((event) => (
        <EventChip key={event.id} event={event} timeZone="UTC" onSelect={() => undefined} />
      ))}
      <OverflowList dateLabel="Monday, August 24, 2026" events={CALENDAR_EVENTS} timeZone="UTC" />
    </div>
  );
}

export function CalendarFilterDemo() {
  const [selected, setSelected] = useState<ReadonlySet<CalendarSourceType>>(
    () => new Set(CALENDAR_SOURCES.map((source) => source.type)),
  );
  return (
    <CalendarFilterLegend
      selected={selected}
      counts={{ TIME_BLOCK: 1, TASK_DUE: 1, MILESTONE: 1, HABIT: 0, REVIEW: 1 }}
      onChange={setSelected}
    />
  );
}

export function CalendarGridsDemo() {
  const [selectedDate, setSelectedDate] = useState<LocalDate>("2026-08-24");
  return (
    <div className="specimen-stack">
      <DayCalendarGrid
        date="2026-08-24"
        events={CALENDAR_EVENTS}
        timeZone="UTC"
        startHour={8}
        endHour={15}
      />
      <WeekCalendarGrid
        date="2026-08-24"
        today="2026-08-24"
        selectedDate={selectedDate}
        events={CALENDAR_EVENTS}
        timeZone="UTC"
        onSelectDate={setSelectedDate}
      />
      <MonthCalendarGrid
        month="2026-08-24"
        today="2026-08-24"
        selectedDate={selectedDate}
        events={CALENDAR_EVENTS}
        timeZone="UTC"
        onSelectDate={setSelectedDate}
      />
      <CalendarListAlternative
        dates={["2026-08-24", "2026-08-25"]}
        events={CALENDAR_EVENTS}
        timeZone="UTC"
      />
    </div>
  );
}
