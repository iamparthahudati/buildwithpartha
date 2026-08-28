import { useState } from "react";

import { Button, Surface, Text } from "@components/ui";
import {
  CALENDAR_SOURCES,
  CalendarScreen,
  type CalendarEvent,
  type CalendarSourceType,
  type CalendarView,
} from "@features/calendar";
import type { LocalDate } from "@lib/localDateTime";

const EVENTS: readonly CalendarEvent[] = [
  {
    id: "milestone:release",
    sourceId: "milestone-release",
    sourceType: "MILESTONE",
    title: "Calendar release checkpoint",
    localDate: "2026-11-01",
    allDay: true,
    status: "PLANNED",
    projectId: "project-calendar",
  },
  ...Array.from({ length: 7 }, (_, index): CalendarEvent => ({
    id: `time-block:dense-${index}`,
    sourceId: `dense-${index}`,
    sourceType: index % 2 === 0 ? "TIME_BLOCK" : "TASK_DUE",
    title: index === 0 ? "Repeated-hour focus block" : `Dense day item ${index + 1}`,
    startAt: new Date(Date.UTC(2026, 10, 1, 5 + index, 30)).toISOString(),
    endAt: new Date(Date.UTC(2026, 10, 1, 6 + index, 15)).toISOString(),
    allDay: false,
    status: "SCHEDULED",
  })),
];

type Scenario =
  | "day"
  | "week"
  | "month"
  | "dst"
  | "offline"
  | "loading"
  | "empty"
  | "filtered"
  | "error"
  | "truncated";

const SCENARIOS: readonly { readonly id: Scenario; readonly label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "dst", label: "DST" },
  { id: "offline", label: "Offline" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty" },
  { id: "filtered", label: "No sources" },
  { id: "error", label: "Error" },
  { id: "truncated", label: "Truncated" },
];

export function CalendarScreenDemo() {
  const [scenario, setScenario] = useState<Scenario>("month");
  const [date, setDate] = useState<LocalDate>("2026-11-01");
  const [view, setView] = useState<CalendarView>("month");
  const [sources, setSources] = useState<ReadonlySet<CalendarSourceType>>(
    () => new Set(CALENDAR_SOURCES.map((source) => source.type)),
  );

  const scenarioView =
    scenario === "day" || scenario === "dst" ? "day" : scenario === "week" ? "week" : view;
  const scenarioSources = scenario === "filtered" ? new Set<CalendarSourceType>() : sources;
  const scenarioEvents = scenario === "empty" || scenario === "error" ? [] : EVENTS;

  return (
    <div className="specimen-stack" style={{ width: "100%" }}>
      <Surface as="div" bordered padding="sm">
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <Text size="xs" weight="semibold">
            CalendarScreen scenario:
          </Text>
          {SCENARIOS.map((option) => (
            <Button
              key={option.id}
              size="sm"
              variant={scenario === option.id ? "primary" : "ghost"}
              onClick={() => {
                setScenario(option.id);
                if (option.id === "month") setView("month");
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Surface>

      <CalendarScreen
        date={date}
        today="2026-11-01"
        view={scenarioView}
        selectedSources={scenarioSources}
        events={scenarioEvents}
        timeZone="America/New_York"
        loading={scenario === "loading"}
        offline={scenario === "offline"}
        error={scenario === "error" ? "Calendar couldn't load." : null}
        truncated={scenario === "truncated"}
        onDateChange={setDate}
        onViewChange={setView}
        onSourcesChange={setSources}
        onSelectEvent={() => undefined}
        onAddTimeBlock={() => undefined}
        onRetry={() => undefined}
      />
    </div>
  );
}
