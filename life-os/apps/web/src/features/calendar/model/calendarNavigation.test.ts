import { describe, expect, it } from "vitest";

import type { CalendarEvent, CalendarSourceType } from "./calendar";
import { calendarEventHref } from "./calendarNavigation";

function event(
  sourceType: CalendarSourceType,
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id: `${sourceType}:source-1`,
    sourceId: "source-1",
    sourceType,
    title: "Source record",
    localDate: "2026-08-24",
    allDay: true,
    status: "OPEN",
    ...overrides,
  };
}

describe("calendarEventHref", () => {
  it("opens canonical Time Block, Task, and Project milestone records", () => {
    const returnTo = "/life-os/app/calendar?date=2026-08-24&view=week";
    expect(calendarEventHref(event("TIME_BLOCK"), "UTC", returnTo)).toContain(
      "/life-os/app/time-blocks?date=2026-08-24&selected=source-1",
    );
    expect(calendarEventHref(event("TASK_DUE"), "UTC", returnTo)).toBe(
      `/life-os/app/tasks/source-1?returnTo=${encodeURIComponent(returnTo)}`,
    );
    expect(
      calendarEventHref(event("MILESTONE", { projectId: "project-1" }), "UTC", returnTo),
    ).toContain("/life-os/app/projects/project-1?tab=timeline&milestone=source-1");
  });

  it("routes reserved Habit and Review projections without losing source identity", () => {
    expect(calendarEventHref(event("HABIT"), "UTC")).toBe("/life-os/app/habits/source-1");
    expect(calendarEventHref(event("REVIEW"), "UTC")).toBe("/life-os/app/reviews/daily/2026-08-24");
    expect(calendarEventHref(event("MILESTONE"), "UTC")).toBe("/life-os/app/projects");
  });
});
