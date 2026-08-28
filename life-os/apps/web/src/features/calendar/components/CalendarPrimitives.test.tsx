import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { CalendarEvent, CalendarSourceType } from "../model/calendar";
import { CalendarFilterLegend } from "./CalendarFilterLegend";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarListAlternative } from "./CalendarListAlternative";
import { MonthCalendarGrid } from "./MonthCalendarGrid";
import { OverflowList } from "./OverflowList";
import { WeekCalendarGrid } from "./WeekCalendarGrid";

const EVENTS: readonly CalendarEvent[] = [
  {
    id: "milestone:one",
    sourceId: "one",
    sourceType: "MILESTONE",
    title: "Calendar primitives ready",
    localDate: "2026-08-24",
    allDay: true,
    status: "OPEN",
  },
  {
    id: "time-block:two",
    sourceId: "two",
    sourceType: "TIME_BLOCK",
    title: "Focused implementation",
    startAt: "2026-08-24T09:00:00Z",
    endAt: "2026-08-24T10:00:00Z",
    allDay: false,
    status: "SCHEDULED",
  },
  {
    id: "task:three",
    sourceId: "three",
    sourceType: "TASK_DUE",
    title: "Run accessibility checks",
    startAt: "2026-08-24T12:00:00Z",
    allDay: false,
    status: "TODO",
  },
  {
    id: "review:four",
    sourceId: "four",
    sourceType: "REVIEW",
    title: "Daily Review",
    localDate: "2026-08-24",
    allDay: true,
    status: "OPEN",
  },
];

describe("Calendar primitives", () => {
  it("navigates periods, returns to today and changes views from the header", async () => {
    const onDateChange = vi.fn();
    const onViewChange = vi.fn();
    const { user } = renderWithUser(
      <CalendarHeader
        date="2026-08-24"
        today="2026-08-25"
        view="week"
        onDateChange={onDateChange}
        onViewChange={onViewChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Previous week" }));
    expect(onDateChange).toHaveBeenCalledWith("2026-08-17");
    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(onDateChange).toHaveBeenCalledWith("2026-08-25");
    await user.click(screen.getByRole("button", { name: "Month" }));
    expect(onViewChange).toHaveBeenCalledWith("month");
  });

  it("updates the selected source set without losing unrelated sources", async () => {
    const selected = new Set<CalendarSourceType>(["TIME_BLOCK", "TASK_DUE"]);
    const onChange = vi.fn();
    const { user } = renderWithUser(
      <CalendarFilterLegend selected={selected} counts={{ TIME_BLOCK: 2 }} onChange={onChange} />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Milestones" }));
    expect(onChange).toHaveBeenCalledOnce();
    const next = onChange.mock.calls[0]![0] as Set<CalendarSourceType>;
    expect([...next]).toEqual(["TIME_BLOCK", "TASK_DUE", "MILESTONE"]);
  });

  it("reveals dense-day overflow, opens the true selected event and closes on Escape", async () => {
    const onSelect = vi.fn();
    const { user } = renderWithUser(
      <OverflowList
        dateLabel="Monday, August 24, 2026"
        events={EVENTS}
        timeZone="UTC"
        onSelectEvent={onSelect}
      />,
    );

    const trigger = screen.getByRole("button", { name: "4 more" });
    await user.click(trigger);
    const panel = screen.getByRole("region", { name: "More events for Monday, August 24, 2026" });
    await user.click(within(panel).getByRole("button", { name: /Focused implementation/ }));
    expect(onSelect).toHaveBeenCalledWith(EVENTS[1]);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: /More events/ })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("supports horizontal keyboard selection in the week grid", async () => {
    const onSelectDate = vi.fn();
    const { user } = renderWithUser(
      <WeekCalendarGrid
        date="2026-08-24"
        today="2026-08-24"
        selectedDate="2026-08-24"
        events={EVENTS}
        timeZone="UTC"
        onSelectDate={onSelectDate}
      />,
    );

    const monday = screen.getByRole("button", { name: "Select Monday, August 24, 2026" });
    monday.focus();
    await user.keyboard("{ArrowRight}");
    expect(onSelectDate).toHaveBeenCalledWith("2026-08-25");
    expect(screen.getByRole("button", { name: "Select Tuesday, August 25, 2026" })).toHaveFocus();
  });

  it("supports two-dimensional month keyboard navigation and a selected-date agenda", async () => {
    const onSelectDate = vi.fn();
    const { user } = renderWithUser(
      <MonthCalendarGrid
        month="2026-08-24"
        today="2026-08-24"
        selectedDate="2026-08-24"
        events={EVENTS}
        timeZone="UTC"
        onSelectDate={onSelectDate}
      />,
    );

    const selected = screen.getByRole("button", { name: /Select Monday, August 24, 2026/ });
    selected.focus();
    await user.keyboard("{ArrowDown}");
    expect(onSelectDate).toHaveBeenCalledWith("2026-08-31");
    expect(screen.getByRole("button", { name: /Select Monday, August 31, 2026/ })).toHaveFocus();
    expect(screen.getByText("Selected date: Monday, August 24, 2026")).toBeInTheDocument();
  });

  it("shows an honest empty list alternative", () => {
    renderWithUser(
      <CalendarListAlternative dates={["2026-08-25"]} events={EVENTS} timeZone="UTC" />,
    );
    expect(screen.getByRole("heading", { name: "No Calendar items" })).toBeInTheDocument();
  });

  it("has no axe violations across the populated primitives", async () => {
    const { container } = renderWithUser(
      <div>
        <CalendarHeader
          date="2026-08-24"
          today="2026-08-24"
          view="month"
          onDateChange={vi.fn()}
          onViewChange={vi.fn()}
        />
        <CalendarFilterLegend
          selected={new Set(["TIME_BLOCK", "TASK_DUE", "MILESTONE"])}
          onChange={vi.fn()}
        />
        <MonthCalendarGrid
          month="2026-08-24"
          today="2026-08-24"
          selectedDate="2026-08-24"
          events={EVENTS}
          timeZone="UTC"
          onSelectDate={vi.fn()}
          onSelectEvent={vi.fn()}
        />
      </div>,
    );
    await expectNoAccessibilityViolations(container);
  });
});
