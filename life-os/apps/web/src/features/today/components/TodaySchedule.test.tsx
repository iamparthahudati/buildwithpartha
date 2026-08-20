import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { TodayScheduleBlock, TodayScheduleState } from "../model/todaySchedule";
import { TodaySchedule, type TodayScheduleProps } from "./TodaySchedule";

const BLOCKS: readonly TodayScheduleBlock[] = [
  {
    id: "block-next",
    title: "Review launch copy",
    href: "/life-os/app/time-blocks/block-next",
    startTime: "11:00",
    endTime: "11:30",
    state: "next",
  },
  {
    id: "block-completed",
    title: "Plan the day",
    href: "/life-os/app/time-blocks/block-completed",
    startTime: "08:30",
    endTime: "09:00",
    state: "completed",
  },
  {
    id: "block-current",
    title: "Write launch outline",
    href: "/life-os/app/time-blocks/block-current",
    startTime: "09:30",
    endTime: "10:30",
    state: "current",
    conflictDescriptions: ["This Time Block overlaps Research by 30 minutes."],
  },
  {
    id: "block-upcoming",
    title: "Daily review",
    href: "/life-os/app/time-blocks/block-upcoming",
    startTime: "17:00",
    endTime: "17:15",
    state: "upcoming",
  },
];

function props(
  state: TodayScheduleState = { type: "ready", blocks: BLOCKS },
  overrides: Partial<TodayScheduleProps> = {},
): TodayScheduleProps {
  return {
    state,
    locale: "en-US",
    onAddTimeBlock: vi.fn(),
    onStartFocus: vi.fn(),
    ...overrides,
  };
}

describe("TodaySchedule", () => {
  it("renders Time Blocks in chronological order with all derived states", () => {
    renderWithUser(<TodaySchedule {...props()} />);

    const list = screen.getByRole("list", { name: "Time Blocks scheduled today" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => within(row).getByRole("heading").textContent)).toEqual([
      "Plan the day",
      "Write launch outline",
      "Review launch copy",
      "Daily review",
    ]);
    expect(within(list).getByText("Completed")).toBeInTheDocument();
    expect(within(list).getByText("Current")).toBeInTheDocument();
    expect(within(list).getByText("Next")).toBeInTheDocument();
    expect(within(list).getByText("Upcoming")).toBeInTheDocument();
    expect(within(list).getByText("Conflict")).toBeInTheDocument();
  });

  it("routes add, start-focus and open-list actions", async () => {
    const onAddTimeBlock = vi.fn();
    const onStartFocus = vi.fn();
    const { user } = renderWithUser(
      <TodaySchedule {...props(undefined, { onAddTimeBlock, onStartFocus })} />,
    );

    await user.click(screen.getByRole("button", { name: "Add time block" }));
    await user.click(screen.getAllByRole("button", { name: "Start focus" })[0]!);
    expect(onAddTimeBlock).toHaveBeenCalledOnce();
    expect(onStartFocus).toHaveBeenCalledWith("block-current");
    expect(screen.getByRole("link", { name: "Open Time Blocks" })).toHaveAttribute(
      "href",
      "/life-os/app/time-blocks",
    );
  });

  it("renders one announced loading region while reserving row space", () => {
    renderWithUser(<TodaySchedule {...props({ type: "loading" })} />);

    const loading = screen.getByRole("status", { name: "Loading today's schedule" });
    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(loading.querySelectorAll(".lifeos-today-schedule__skeleton-row")).toHaveLength(3);
  });

  it("renders an honest first-use state and normalizes an empty ready payload", async () => {
    const onAddTimeBlock = vi.fn();
    const { user, rerender } = renderWithUser(
      <TodaySchedule {...props({ type: "empty" }, { onAddTimeBlock })} />,
    );

    expect(screen.getByText("Plan part of today")).toBeInTheDocument();
    expect(
      screen.getByText("Add a Time Block to reserve time for what matters."),
    ).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Add time block" })[1]!);
    expect(onAddTimeBlock).toHaveBeenCalledOnce();

    rerender(<TodaySchedule {...props({ type: "ready", blocks: [] }, { onAddTimeBlock })} />);
    expect(screen.getByText("Plan part of today")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Time Blocks scheduled today" })).toBeNull();
  });

  it("isolates an error with retry and a canonical escape path", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <TodaySchedule
        {...props(
          { type: "error", message: "Other Today sections are still available." },
          { onRetry },
        )}
      />,
    );

    expect(screen.getByText("Today's schedule couldn't load.")).toBeInTheDocument();
    expect(screen.getByText("Other Today sections are still available.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Open Time Blocks" })).toBeInTheDocument();
  });

  it("blocks parallel starts and exposes the disabled reason", () => {
    renderWithUser(
      <TodaySchedule
        {...props(undefined, {
          startingBlockId: "block-current",
          startDisabledReason: "A focus session is already active.",
        })}
      />,
    );

    const startButtons = screen.getAllByRole("button", { name: "Start focus" });
    expect(startButtons[0]).toHaveAttribute("aria-busy", "true");
    expect(startButtons[1]).toBeDisabled();
    expect(startButtons[1]).toHaveAttribute("title", "A focus session is already active.");
  });

  it("has no accessibility violations in ready, empty and error states", async () => {
    const { container, rerender } = renderWithUser(<TodaySchedule {...props()} />);
    await expectNoAccessibilityViolations(container);

    rerender(<TodaySchedule {...props({ type: "empty" })} />);
    await expectNoAccessibilityViolations(container);

    rerender(
      <TodaySchedule
        {...props({ type: "error", message: "Other Today sections are still available." })}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
