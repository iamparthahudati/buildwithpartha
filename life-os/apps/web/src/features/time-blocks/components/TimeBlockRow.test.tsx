import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TimeBlockRow } from "./TimeBlockRow";
import type { TimeBlock } from "../model/timeBlock";

const MOCK_TIME_BLOCK: TimeBlock = {
  id: "tb-1",
  title: "Focus: Core API Specs",
  category: "Deep work",
  categoryColor: "blue",
  categoryIcon: "brain",
  date: "2026-08-21",
  startTime: "09:00",
  endTime: "10:30",
  status: "SCHEDULED",
  projectId: "proj-101",
  projectName: "LifeOS Engine",
  taskId: "task-202",
  taskTitle: "Design OpenAPI Contracts",
  notes: "Focus block for API specification",
};

const NOW = new Date("2026-08-21T09:15:00Z");

describe("TimeBlockRow", () => {
  it("renders time block details correctly in default scheduled state", () => {
    renderWithUser(
      <TimeBlockRow timeBlock={MOCK_TIME_BLOCK} now={NOW} locale="en-US" timeZone="UTC" />,
    );

    expect(
      screen.getByRole("link", { name: "Open time block: Focus: Core API Specs" }),
    ).toHaveAttribute("href", "/life-os/app/time-blocks/tb-1");
    expect(screen.getByText("Deep work")).toBeInTheDocument();
    expect(screen.getByText("LifeOS Engine")).toBeInTheDocument();
    expect(screen.getByText("Design OpenAPI Contracts")).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("9:00 AM – 10:30 AM")).toBeInTheDocument();
    expect(screen.getByText("(1 hr 30 min)")).toBeInTheDocument();
  });

  it("renders loading skeleton state when loading is true", () => {
    renderWithUser(<TimeBlockRow loading />);

    expect(screen.getByText("Loading time block.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders current active state and badge explicitly and implicitly", () => {
    const { unmount: u1 } = renderWithUser(
      <TimeBlockRow
        timeBlock={MOCK_TIME_BLOCK}
        isCurrent
        now={NOW}
        locale="en-US"
        timeZone="UTC"
      />,
    );
    expect(screen.getByText("Current")).toBeInTheDocument();
    u1();

    // Implicit current via time range calculation (09:15 is inside 09:00 - 10:30)
    const { unmount: u2 } = renderWithUser(
      <TimeBlockRow timeBlock={MOCK_TIME_BLOCK} now={NOW} locale="en-US" timeZone="UTC" />,
    );
    expect(screen.getByText("Current")).toBeInTheDocument();
    u2();

    // Implicit current via IN_PROGRESS status
    const inProgressBlock: TimeBlock = {
      ...MOCK_TIME_BLOCK,
      status: "IN_PROGRESS",
    };
    const { unmount: u3 } = renderWithUser(
      <TimeBlockRow timeBlock={inProgressBlock} now={NOW} locale="en-US" timeZone="UTC" />,
    );
    expect(screen.getByText("Current")).toBeInTheDocument();
    u3();

    // Block on a different day is not current
    const futureBlock: TimeBlock = {
      ...MOCK_TIME_BLOCK,
      date: "2026-08-22",
    };
    renderWithUser(
      <TimeBlockRow timeBlock={futureBlock} now={NOW} locale="en-US" timeZone="UTC" />,
    );
    expect(screen.queryByText("Current")).not.toBeInTheDocument();
  });

  it("renders completed state and hides focus action", () => {
    const completedBlock: TimeBlock = {
      ...MOCK_TIME_BLOCK,
      status: "COMPLETED",
      completed: true,
    };

    renderWithUser(
      <TimeBlockRow
        timeBlock={completedBlock}
        onStartFocus={vi.fn()}
        onComplete={vi.fn()}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
      />,
    );

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start focus" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
  });

  it("renders cancelled state correctly", () => {
    const cancelledBlock: TimeBlock = {
      ...MOCK_TIME_BLOCK,
      status: "CANCELLED",
    };

    renderWithUser(
      <TimeBlockRow timeBlock={cancelledBlock} now={NOW} locale="en-US" timeZone="UTC" />,
    );

    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("renders conflict badge and inline conflict messages", () => {
    renderWithUser(
      <TimeBlockRow
        timeBlock={MOCK_TIME_BLOCK}
        hasConflict
        conflictDescriptions={["Overlaps with Team Sync (09:00 – 09:30)"]}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
      />,
    );

    expect(screen.getByText("Conflict")).toBeInTheDocument();
    expect(screen.getByText("Overlaps with Team Sync (09:00 – 09:30)")).toBeInTheDocument();
  });

  it("handles category object and category text fallback resolution", () => {
    const categories = [
      "Team Meeting",
      "Health Workout",
      "Personal Life",
      "Work Office",
      "Side Project",
      "General Category",
    ];

    categories.forEach((cat, index) => {
      const block: TimeBlock = {
        ...MOCK_TIME_BLOCK,
        id: `tb-cat-${index}`,
        category: cat,
        categoryIcon: null,
      };
      const { unmount } = renderWithUser(
        <TimeBlockRow timeBlock={block} now={NOW} locale="en-US" timeZone="UTC" />,
      );
      expect(screen.getByText(cat)).toBeInTheDocument();
      unmount();
    });

    const structuredBlock: TimeBlock = {
      ...MOCK_TIME_BLOCK,
      category: { name: "Team Sync", color: "purple", icon: "users" },
      project: { id: "p1", name: "Alpha Project", href: "/projects/p1" },
      task: { id: "t1", title: "Subtask 1", href: "/tasks/t1" },
    };

    renderWithUser(
      <TimeBlockRow timeBlock={structuredBlock} now={NOW} locale="en-US" timeZone="UTC" />,
    );

    expect(screen.getByText("Team Sync")).toBeInTheDocument();
    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
    expect(screen.getByText("Subtask 1")).toBeInTheDocument();
  });

  it("renders starting focus loading state and disabled focus button", () => {
    renderWithUser(
      <TimeBlockRow
        timeBlock={MOCK_TIME_BLOCK}
        onStartFocus={vi.fn()}
        startingFocus
        startFocusDisabled
        startFocusDisabledReason="Another session is active"
        now={NOW}
        locale="en-US"
        timeZone="UTC"
      />,
    );

    const btn = screen.getByRole("button", { name: "Start focus" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toHaveAttribute("title", "Another session is active");
  });

  it("triggers onStartFocus when Start focus button is clicked", async () => {
    const onStartFocus = vi.fn();

    const { user } = renderWithUser(
      <TimeBlockRow
        timeBlock={MOCK_TIME_BLOCK}
        onStartFocus={onStartFocus}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
      />,
    );

    const startBtn = screen.getByRole("button", { name: "Start focus" });
    await user.click(startBtn);

    expect(onStartFocus).toHaveBeenCalledOnce();
  });

  it("triggers onComplete when Complete button is clicked", async () => {
    const onComplete = vi.fn();

    const { user } = renderWithUser(
      <TimeBlockRow
        timeBlock={MOCK_TIME_BLOCK}
        onComplete={onComplete}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
      />,
    );

    const completeBtn = screen.getByRole("button", { name: "Complete" });
    await user.click(completeBtn);

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("renders actions menu dropdown and triggers item actions on select", async () => {
    const onStartFocus = vi.fn();
    const onComplete = vi.fn();
    const onEdit = vi.fn();
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();

    const { user, unmount } = renderWithUser(
      <TimeBlockRow
        timeBlock={MOCK_TIME_BLOCK}
        onStartFocus={onStartFocus}
        onComplete={onComplete}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
      />,
    );

    let menuTrigger = screen.getByRole("button", { name: "Time block actions" });
    await user.click(menuTrigger);

    await user.click(screen.getByRole("menuitem", { name: "Start focus" }));
    expect(onStartFocus).toHaveBeenCalledOnce();

    menuTrigger = screen.getByRole("button", { name: "Time block actions" });
    await user.click(menuTrigger);
    await user.click(screen.getByRole("menuitem", { name: "Mark completed" }));
    expect(onComplete).toHaveBeenCalledOnce();

    menuTrigger = screen.getByRole("button", { name: "Time block actions" });
    await user.click(menuTrigger);
    await user.click(screen.getByRole("menuitem", { name: "Edit time block" }));
    expect(onEdit).toHaveBeenCalledOnce();

    menuTrigger = screen.getByRole("button", { name: "Time block actions" });
    await user.click(menuTrigger);
    await user.click(screen.getByRole("menuitem", { name: "Duplicate time block" }));
    expect(onDuplicate).toHaveBeenCalledOnce();

    menuTrigger = screen.getByRole("button", { name: "Time block actions" });
    await user.click(menuTrigger);
    await user.click(screen.getByRole("menuitem", { name: "Delete time block" }));
    expect(onDelete).toHaveBeenCalledOnce();

    unmount();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <TimeBlockRow
        timeBlock={MOCK_TIME_BLOCK}
        isCurrent
        hasConflict
        conflictDescriptions={["Overlaps with Team Sync"]}
        onStartFocus={vi.fn()}
        onComplete={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
      />,
    );

    await expectNoAccessibilityViolations(container);
  });
});
