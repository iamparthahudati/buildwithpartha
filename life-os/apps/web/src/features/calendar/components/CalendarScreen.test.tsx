import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { CalendarEvent, CalendarSourceType, CalendarView } from "../model/calendar";
import { CalendarScreen } from "./CalendarScreen";

const EVENTS: readonly CalendarEvent[] = [
  {
    id: "milestone:one",
    sourceId: "one",
    sourceType: "MILESTONE",
    title: "Ship Calendar integration",
    localDate: "2026-11-01",
    allDay: true,
    status: "PLANNED",
    projectId: "project-1",
  },
  {
    id: "time-block:two",
    sourceId: "two",
    sourceType: "TIME_BLOCK",
    title: "DST boundary focus",
    startAt: "2026-11-01T05:30:00Z",
    endAt: "2026-11-01T06:30:00Z",
    allDay: false,
    status: "SCHEDULED",
  },
];

const ALL_SOURCES = new Set<CalendarSourceType>([
  "TIME_BLOCK",
  "TASK_DUE",
  "MILESTONE",
  "HABIT",
  "REVIEW",
]);

function renderScreen(overrides: Partial<React.ComponentProps<typeof CalendarScreen>> = {}) {
  const props: React.ComponentProps<typeof CalendarScreen> = {
    date: "2026-11-01",
    today: "2026-11-01",
    view: "day",
    selectedSources: ALL_SOURCES,
    events: EVENTS,
    timeZone: "America/New_York",
    onDateChange: vi.fn(),
    onViewChange: vi.fn(),
    onSourcesChange: vi.fn(),
    onSelectEvent: vi.fn(),
    ...overrides,
  };
  return { ...renderWithUser(<CalendarScreen {...props} />), props };
}

describe("CalendarScreen", () => {
  it("composes the day Calendar across a DST boundary and opens the true event", async () => {
    const onSelectEvent = vi.fn();
    const { user } = renderScreen({ onSelectEvent });

    expect(screen.getByRole("heading", { level: 1, name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByText("DST boundary focus")).toBeInTheDocument();
    expect(screen.getByText("1:30 AM–1:30 AM")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /DST boundary focus/ }));
    expect(onSelectEvent).toHaveBeenCalledWith(EVENTS[1]);
  });

  it.each<CalendarView>(["week", "month"])("renders the populated %s composition", (view) => {
    renderScreen({ view });
    expect(
      screen.getByRole("region", {
        name: view === "month" ? "November 2026" : "Week Calendar",
      }),
    ).toBeInTheDocument();
  });

  it("updates source filters and shows the deliberate no-source state", async () => {
    const onSourcesChange = vi.fn();
    const { user, rerender, props } = renderScreen({ onSourcesChange });
    await user.click(screen.getByRole("checkbox", { name: "Time Blocks (1)" }));
    expect(onSourcesChange).toHaveBeenCalledOnce();

    rerender(<CalendarScreen {...props} selectedSources={new Set()} events={[]} />);
    expect(
      screen.getByRole("heading", { name: "No Calendar sources selected" }),
    ).toBeInTheDocument();
  });

  it("keeps cached items visible through offline, truncation, refresh, and refresh-error states", () => {
    renderScreen({
      offline: true,
      truncated: true,
      refreshing: true,
      error: "Network unavailable",
    });
    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText("Some Calendar items aren't shown")).toBeInTheDocument();
    expect(screen.getByText("Refreshing Calendar…")).toBeInTheDocument();
    expect(screen.getByText("Calendar couldn't refresh")).toBeInTheDocument();
    expect(screen.getByText("DST boundary focus")).toBeInTheDocument();
  });

  it("shows retryable page failure and honest empty and loading states", async () => {
    const onRetry = vi.fn();
    const { user, rerender, props } = renderScreen({ events: [], error: "Failed", onRetry });
    expect(screen.getByRole("heading", { name: "Calendar couldn't load" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<CalendarScreen {...props} events={[]} error={null} />);
    expect(screen.getByText("No Calendar items in this range")).toBeInTheDocument();

    rerender(<CalendarScreen {...props} events={[]} error={null} loading />);
    expect(screen.getByLabelText("Loading day Calendar")).toHaveAttribute("aria-busy", "true");

    rerender(<CalendarScreen {...props} events={[]} error="Offline" offline />);
    expect(screen.getByText(/No saved Calendar items are available/)).toBeInTheDocument();
  });

  it("passes an accessibility audit", async () => {
    const { container } = renderScreen({ view: "month" });
    await expectNoAccessibilityViolations(container);
  });
});
