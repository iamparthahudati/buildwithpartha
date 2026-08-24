import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import type { WeekDayPlan } from "../model/weekPlanner";
import { WeekStrip } from "./WeekStrip";

const SAMPLE_DAYS: readonly WeekDayPlan[] = [
  {
    localDate: "2026-08-17",
    dayOfWeek: "Mon",
    plannedMinutes: 480,
    availableMinutes: 480,
    totalTasksCount: 4,
    completedTasksCount: 2,
  },
  {
    localDate: "2026-08-18",
    dayOfWeek: "Tue",
    plannedMinutes: 600,
    availableMinutes: 480,
    totalTasksCount: 5,
    completedTasksCount: 1,
    isOvercapacity: true,
  },
  {
    localDate: "2026-08-19",
    dayOfWeek: "Wed",
    plannedMinutes: 300,
    availableMinutes: 480,
    totalTasksCount: 3,
    completedTasksCount: 3,
  },
  {
    localDate: "2026-08-20",
    dayOfWeek: "Thu",
    plannedMinutes: 420,
    availableMinutes: 480,
    totalTasksCount: 4,
    completedTasksCount: 0,
    isToday: true,
    hasConflict: true,
  },
  {
    localDate: "2026-08-21",
    dayOfWeek: "Fri",
    plannedMinutes: 240,
    availableMinutes: 480,
    totalTasksCount: 2,
    completedTasksCount: 1,
  },
  {
    localDate: "2026-08-22",
    dayOfWeek: "Sat",
    plannedMinutes: 0,
    availableMinutes: 0,
    totalTasksCount: 0,
    completedTasksCount: 0,
  },
  {
    localDate: "2026-08-23",
    dayOfWeek: "Sun",
    plannedMinutes: 0,
    availableMinutes: 0,
    totalTasksCount: 0,
    completedTasksCount: 0,
  },
];

describe("WeekStrip", () => {
  it("renders seven days with capacity info and identifies today and overcapacity status", () => {
    renderWithUser(<WeekStrip days={SAMPLE_DAYS} locale="en-US" />);

    const list = screen.getByRole("list", { name: "Seven-day week plan and capacity" });
    const days = within(list).getAllByRole("listitem");
    expect(days).toHaveLength(7);

    expect(days[3]).toHaveAttribute("aria-current", "date");
    expect(within(days[3]!).getByText("Today")).toBeInTheDocument();
    expect(within(days[3]!).getByText("Conflict")).toBeInTheDocument();

    expect(within(days[1]!).getByText("Over")).toBeInTheDocument();
  });

  it("handles day selection and action menu interactions", async () => {
    const handleSelectDate = vi.fn();
    const handleAdjustCapacity = vi.fn();
    const { user } = renderWithUser(
      <WeekStrip
        days={SAMPLE_DAYS}
        selectedDate="2026-08-17"
        onSelectDate={handleSelectDate}
        onAdjustCapacity={handleAdjustCapacity}
        locale="en-US"
      />,
    );

    const firstDayTrigger = screen.getByRole("button", {
      name: /Monday, August 17, 2026/i,
    });
    expect(firstDayTrigger).toHaveAttribute("aria-pressed", "true");

    await user.click(firstDayTrigger);
    expect(handleSelectDate).toHaveBeenCalledWith("2026-08-17");

    const actionMenuTrigger = screen.getByRole("button", {
      name: "Day actions for Mon 17",
    });
    await user.click(actionMenuTrigger);

    const adjustOption = screen.getByRole("menuitem", { name: "Adjust capacity for Mon" });
    await user.click(adjustOption);
    expect(handleAdjustCapacity).toHaveBeenCalledWith(SAMPLE_DAYS[0]);
  });

  it("renders loading state", () => {
    renderWithUser(<WeekStrip days={[]} loading locale="en-US" />);
    expect(screen.getByText("Loading week plan...")).toBeInTheDocument();
  });

  it("renders error state with retry", async () => {
    const handleRetry = vi.fn();
    const { user } = renderWithUser(
      <WeekStrip days={[]} error="Failed to load week strip" onRetry={handleRetry} />,
    );

    expect(screen.getByText("Failed to load week strip")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: "Try again" });
    await user.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledOnce();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <WeekStrip days={SAMPLE_DAYS} selectedDate="2026-08-20" locale="en-US" />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
