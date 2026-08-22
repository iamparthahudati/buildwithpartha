import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { TodayWeekDay } from "../model/todaySprintWeek";
import { WeeklyDayStrip } from "./WeeklyDayStrip";

const DAYS: readonly TodayWeekDay[] = [
  { localDate: "2026-08-17", completedTasksCount: 2, totalTasksCount: 3 },
  { localDate: "2026-08-18", completedTasksCount: 1, totalTasksCount: 2 },
  { localDate: "2026-08-19", completedTasksCount: 0, totalTasksCount: 0 },
  { localDate: "2026-08-20", completedTasksCount: 1, totalTasksCount: 4, isToday: true },
  { localDate: "2026-08-21", completedTasksCount: 0, totalTasksCount: 2 },
  { localDate: "2026-08-22", completedTasksCount: 0, totalTasksCount: 1 },
  { localDate: "2026-08-23", completedTasksCount: 0, totalTasksCount: 0 },
];

describe("WeeklyDayStrip", () => {
  it("renders seven local dates in caller-supplied week order and identifies today", () => {
    renderWithUser(<WeeklyDayStrip days={DAYS} locale="en-GB" />);

    const list = screen.getByRole("list", { name: "Weekly plan by day" });
    const days = within(list).getAllByRole("listitem");
    expect(days).toHaveLength(7);
    expect(
      days.map((day) => day.querySelector(".lifeos-weekly-day-strip__weekday")?.textContent),
    ).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(days[3]).toHaveAttribute("aria-current", "date");
    expect(within(days[3]!).getByLabelText("Thursday, 20 August 2026")).toBeInTheDocument();
  });

  it("names each task denominator and does not invent a zero-percent measure", () => {
    renderWithUser(<WeeklyDayStrip days={DAYS} locale="en-US" />);

    expect(
      screen.getByRole("progressbar", { name: "Monday, August 17, 2026 task completion" }),
    ).toHaveAttribute("aria-valuetext", "2 of 3 planned tasks done");
    expect(screen.getAllByText("No tasks")).toHaveLength(2);
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(<WeeklyDayStrip days={DAYS} locale="en-US" />);
    await expectNoAccessibilityViolations(container);
  });
});
