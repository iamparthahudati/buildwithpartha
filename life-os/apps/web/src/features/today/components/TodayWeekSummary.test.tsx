import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { TodayWeekData, TodayWeekState } from "../model/todaySprintWeek";
import { TodayWeekSummary } from "./TodayWeekSummary";

const WEEK: TodayWeekData = {
  startDate: "2026-08-17",
  endDate: "2026-08-23",
  days: [
    { localDate: "2026-08-17", completedTasksCount: 2, totalTasksCount: 3 },
    { localDate: "2026-08-18", completedTasksCount: 1, totalTasksCount: 2 },
    { localDate: "2026-08-19", completedTasksCount: 0, totalTasksCount: 1 },
    { localDate: "2026-08-20", completedTasksCount: 1, totalTasksCount: 3, isToday: true },
    { localDate: "2026-08-21", completedTasksCount: 0, totalTasksCount: 1 },
    { localDate: "2026-08-22", completedTasksCount: 0, totalTasksCount: 0 },
    { localDate: "2026-08-23", completedTasksCount: 0, totalTasksCount: 0 },
  ],
  goals: [
    { id: "goal-1", title: "Finish course module", completed: true },
    { id: "goal-2", title: "Publish notes", completed: false },
  ],
  plannedMinutes: 1_500,
  capacityMinutes: 1_200,
};

const READY: TodayWeekState = { type: "ready", week: WEEK };

describe("TodayWeekSummary", () => {
  it("renders the day strip, goals, capacity, over-capacity explanation, and planner link", () => {
    renderWithUser(<TodayWeekSummary state={READY} locale="en-US" />);

    expect(screen.getByText("Aug 17, 2026 – Aug 23, 2026")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Weekly plan by day" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Weekly goals" })).toHaveAttribute(
      "aria-valuetext",
      "1 of 2 weekly goals completed",
    );
    expect(screen.getByRole("progressbar", { name: "Weekly capacity" })).toHaveAttribute(
      "aria-valuetext",
      "25 hours planned of 20 hours capacity; over capacity",
    );
    expect(
      screen.getByText("Planned time is above the capacity set for this week."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Week Planner" })).toHaveAttribute(
      "href",
      "/life-os/app/week-planner",
    );
  });

  it("does not invent percentages when goals or capacity have no denominator", () => {
    renderWithUser(
      <TodayWeekSummary
        state={{
          type: "ready",
          week: { ...WEEK, goals: [], plannedMinutes: 0, capacityMinutes: 0 },
        }}
        locale="en-US"
      />,
    );

    expect(screen.getByText("No goals linked to this week.")).toBeInTheDocument();
    expect(screen.getByText("No weekly capacity set.")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Weekly goals" })).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Weekly capacity" })).not.toBeInTheDocument();
  });

  it("renders loading, empty, and isolated error states", async () => {
    const onRetry = vi.fn();
    const { user, rerender } = renderWithUser(
      <TodayWeekSummary state={{ type: "loading" }} locale="en-US" />,
    );
    expect(screen.getByRole("status", { name: "Loading this week's plan" })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    rerender(<TodayWeekSummary state={{ type: "empty" }} locale="en-US" />);
    expect(screen.getByText("No Weekly Plan yet")).toBeInTheDocument();

    rerender(
      <TodayWeekSummary
        state={{ type: "error", message: "Other Today sections are still available." }}
        locale="en-US"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("This week's plan couldn't load.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("has no accessibility violations in ready and empty states", async () => {
    const { container, rerender } = renderWithUser(
      <TodayWeekSummary state={READY} locale="en-US" />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(<TodayWeekSummary state={{ type: "empty" }} locale="en-US" />);
    await expectNoAccessibilityViolations(container);
  });
});
