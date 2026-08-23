import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TimeBlock } from "@features/time-blocks";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { SchedulingPanel, type SchedulingPanelTask } from "./SchedulingPanel";

const TASK: SchedulingPanelTask = {
  id: "task-weekly-review",
  title: "Prepare weekly review",
  status: "IN_PROGRESS",
};

const TIME_BLOCKS: readonly TimeBlock[] = [
  {
    id: "block-planning",
    title: "Weekly planning",
    category: "Deep work",
    categoryColor: "blue",
    categoryIcon: "brain",
    date: "2026-08-24",
    startTime: "09:00",
    endTime: "10:00",
    status: "SCHEDULED",
    taskId: TASK.id,
    taskTitle: TASK.title,
  },
  {
    id: "block-reading",
    title: "Reading",
    category: "Learning",
    categoryColor: "green",
    categoryIcon: "book-open",
    date: "2026-08-24",
    startTime: "15:00",
    endTime: "15:30",
    status: "SCHEDULED",
    taskId: TASK.id,
    taskTitle: TASK.title,
  },
];

const NOW = new Date("2026-08-23T12:00:00Z");

describe("SchedulingPanel", () => {
  it("renders confirmed time and linked Time Blocks, then delegates schedule and focus actions", async () => {
    const onSchedule = vi.fn();
    const onStartFocus = vi.fn();
    const { user } = renderWithUser(
      <SchedulingPanel
        task={TASK}
        timeBlocks={TIME_BLOCKS}
        spentMinutes={95}
        locale="en-US"
        timeZone="UTC"
        now={NOW}
        onSchedule={onSchedule}
        onStartFocus={onStartFocus}
      />,
    );

    const panel = screen.getByRole("region", { name: "Schedule and focus" });
    expect(within(panel).getByText("1 hr 35 min")).toBeInTheDocument();
    expect(within(panel).getByText("Confirmed Focus Session time")).toBeInTheDocument();
    expect(within(panel).getByText("2 Time Blocks")).toBeInTheDocument();
    expect(
      within(panel).getByRole("link", { name: "Open time block: Weekly planning" }),
    ).toHaveAttribute("href", "/life-os/app/time-blocks/block-planning");

    await user.click(within(panel).getByRole("button", { name: "Schedule" }));
    expect(onSchedule).toHaveBeenCalledOnce();

    const startButtons = within(panel).getAllByRole("button", { name: "Start focus" });
    await user.click(startButtons[0]!);
    expect(onStartFocus).toHaveBeenLastCalledWith(undefined);

    const planningRow = within(panel)
      .getByRole("link", { name: "Open time block: Weekly planning" })
      .closest("li");
    expect(planningRow).not.toBeNull();
    await user.click(within(planningRow!).getByRole("button", { name: "Start focus" }));
    expect(onStartFocus).toHaveBeenLastCalledWith("block-planning");
  });

  it("keeps Schedule and Start focus in a predictable keyboard order", async () => {
    const onSchedule = vi.fn();
    const onStartFocus = vi.fn();
    const { user } = renderWithUser(
      <SchedulingPanel
        task={TASK}
        timeBlocks={TIME_BLOCKS.slice(0, 1)}
        onSchedule={onSchedule}
        onStartFocus={onStartFocus}
      />,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Schedule" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSchedule).toHaveBeenCalledOnce();

    await user.tab();
    expect(screen.getAllByRole("button", { name: "Start focus" })[0]).toHaveFocus();
    await user.keyboard(" ");
    expect(onStartFocus).toHaveBeenCalledWith(undefined);
  });

  it("names linked schedule conflicts and delegates explicit resolution", async () => {
    const onResolveScheduleConflict = vi.fn();
    const { user } = renderWithUser(
      <SchedulingPanel
        task={TASK}
        timeBlocks={[
          {
            ...TIME_BLOCKS[0]!,
            hasConflict: true,
            conflictDescriptions: ["Overlaps with Reading (09:30 – 10:15)"],
          },
        ]}
        spentMinutes={0}
        onResolveScheduleConflict={onResolveScheduleConflict}
      />,
    );

    expect(screen.getByText("Schedule conflict")).toBeInTheDocument();
    expect(
      screen.getByText(
        "One linked Time Block overlaps another scheduled item. Review the named times before continuing.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Overlaps with Reading (09:30 – 10:15)")).toBeInTheDocument();
    expect(screen.getByText("0 min")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resolve schedule conflict" }));
    expect(onResolveScheduleConflict).toHaveBeenCalledOnce();
  });

  it("uses shared active Focus Session state instead of offering a duplicate start", async () => {
    const onOpenActiveFocus = vi.fn();
    const { user, unmount } = renderWithUser(
      <SchedulingPanel
        task={TASK}
        timeBlocks={TIME_BLOCKS.slice(0, 1)}
        activeFocusSession={{
          id: "focus-current",
          taskId: TASK.id,
          timeBlockId: "block-planning",
          status: "paused",
          taskTitle: TASK.title,
        }}
        onStartFocus={vi.fn()}
        onOpenActiveFocus={onOpenActiveFocus}
      />,
    );

    expect(screen.getByText("Focus paused")).toBeInTheDocument();
    expect(screen.getByText("Focus is already active for this Task")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start focus" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open focus" }));
    expect(onOpenActiveFocus).toHaveBeenCalledOnce();
    unmount();

    renderWithUser(
      <SchedulingPanel
        task={TASK}
        activeFocusSession={{
          id: "focus-other",
          taskId: "task-hosting",
          timeBlockId: null,
          status: "running",
          taskTitle: "Compare hosting options",
        }}
        onStartFocus={vi.fn()}
      />,
    );

    expect(screen.getByText("Another Focus Session is active")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Compare hosting options is using the active Focus Session. Complete or cancel it before starting focus here.",
      ),
    ).toBeInTheDocument();
  });

  it("covers loading, first-use empty, and isolated load-error recovery", async () => {
    const { unmount: unmountLoading } = renderWithUser(<SchedulingPanel task={TASK} loading />);
    expect(screen.getByText("Loading scheduling and focus details.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    unmountLoading();

    const onSchedule = vi.fn();
    const { user, unmount: unmountEmpty } = renderWithUser(
      <SchedulingPanel task={TASK} spentMinutes={null} onSchedule={onSchedule} />,
    );
    expect(screen.getByText("No linked Time Blocks")).toBeInTheDocument();
    expect(screen.getByText("Not recorded")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Schedule" }));
    expect(onSchedule).toHaveBeenCalledOnce();
    unmountEmpty();

    const onRetry = vi.fn();
    renderWithUser(
      <SchedulingPanel task={TASK} error="Task details are still available." onRetry={onRetry} />,
    );
    expect(screen.getByText("Scheduling details couldn't load")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("keeps confirmed details visible in permission, unavailable, blocked, and terminal states", () => {
    const { unmount: unmountReadOnly } = renderWithUser(
      <SchedulingPanel
        task={TASK}
        timeBlocks={TIME_BLOCKS.slice(0, 1)}
        spentMinutes={30}
        readOnly
        readOnlyReason="You can view this schedule, but you don't have permission to change it."
        onSchedule={vi.fn()}
        onStartFocus={vi.fn()}
      />,
    );
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(
      screen.getByText("You can view this schedule, but you don't have permission to change it."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schedule" })).toBeDisabled();
    screen
      .getAllByRole("button", { name: "Start focus" })
      .forEach((button) => expect(button).toBeDisabled());
    unmountReadOnly();

    const { unmount: unmountDisabled } = renderWithUser(
      <SchedulingPanel
        task={TASK}
        disabled
        disabledReason="Reconnect to schedule this Task or start focus."
        onSchedule={vi.fn()}
        onStartFocus={vi.fn()}
      />,
    );
    expect(screen.getByText("Reconnect to schedule this Task or start focus.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schedule" })).toBeDisabled();
    unmountDisabled();

    const { unmount: unmountBlocked } = renderWithUser(
      <SchedulingPanel
        task={{ ...TASK, status: "BLOCKED" }}
        onSchedule={vi.fn()}
        onStartFocus={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Schedule" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Start focus" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start focus" })).toHaveAttribute(
      "title",
      "Resolve this Task's blockers before starting a Focus Session.",
    );
    unmountBlocked();

    renderWithUser(
      <SchedulingPanel
        task={{ ...TASK, status: "DONE" }}
        onSchedule={vi.fn()}
        onStartFocus={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        "This Task is done. Reopen it before changing its schedule or starting focus.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schedule" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start focus" })).toBeDisabled();
  });

  it("shows pending operations and preserves safe recovery copy for partial failures", async () => {
    const onRetrySchedule = vi.fn();
    const onRetryFocus = vi.fn();
    const { user } = renderWithUser(
      <SchedulingPanel
        task={TASK}
        timeBlocks={TIME_BLOCKS}
        scheduling
        scheduleError="Scheduling couldn't continue. Your linked Time Blocks are unchanged."
        onSchedule={vi.fn()}
        onRetrySchedule={onRetrySchedule}
        startingTimeBlockId="block-planning"
        focusError="Focus couldn't start. No time was recorded."
        onStartFocus={vi.fn()}
        onRetryFocus={onRetryFocus}
      />,
    );

    expect(screen.getByRole("button", { name: "Schedule" })).toHaveAttribute("aria-busy", "true");
    const planningRow = screen
      .getByRole("link", { name: "Open time block: Weekly planning" })
      .closest("li");
    expect(within(planningRow!).getByRole("button", { name: "Start focus" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    const readingRow = screen.getByRole("link", { name: "Open time block: Reading" }).closest("li");
    expect(within(readingRow!).getByRole("button", { name: "Start focus" })).toBeDisabled();

    expect(screen.getByText("Focus couldn't start. No time was recorded.")).toBeInTheDocument();
    const retryButtons = screen.getAllByRole("button", { name: "Try again" });
    await user.click(retryButtons[0]!);
    await user.click(retryButtons[1]!);
    expect(onRetrySchedule).toHaveBeenCalledOnce();
    expect(onRetryFocus).toHaveBeenCalledOnce();
  });

  it("surfaces a rejected Focus Session start without claiming time was recorded", async () => {
    const { user } = renderWithUser(
      <SchedulingPanel
        task={TASK}
        onStartFocus={vi.fn().mockRejectedValue(new Error("service unavailable"))}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start focus" }));
    expect(await screen.findByText("Focus couldn't start")).toBeInTheDocument();
    expect(
      screen.getByText("We couldn't start this Focus Session. No time was recorded. Try again."),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations across ready and conflict/active states", async () => {
    const { container, rerender } = renderWithUser(
      <SchedulingPanel
        task={TASK}
        timeBlocks={TIME_BLOCKS}
        spentMinutes={45}
        onSchedule={vi.fn()}
        onStartFocus={vi.fn()}
      />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(
      <SchedulingPanel
        task={TASK}
        timeBlocks={[{ ...TIME_BLOCKS[0]!, hasConflict: true }]}
        activeFocusSession={{
          id: "focus-other",
          taskId: "task-hosting",
          timeBlockId: null,
          status: "running",
          taskTitle: "Compare hosting options",
        }}
        onStartFocus={vi.fn()}
        onOpenActiveFocus={vi.fn()}
        onResolveScheduleConflict={vi.fn()}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
