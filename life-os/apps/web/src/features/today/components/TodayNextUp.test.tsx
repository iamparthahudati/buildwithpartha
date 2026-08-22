import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TodayNextUp, type TodayNextUpProps } from "./TodayNextUp";

const BASE_PROPS: Omit<TodayNextUpProps, "status"> = {
  sourceLabel: "Open tasks",
  rankingRule: "Overdue first, then due date, priority, and planned order.",
  tasksHref: "/life-os/app/tasks",
};

const READY_STATUS = {
  type: "ready" as const,
  availability: "no-focus-selected" as const,
  task: {
    id: "task-1",
    title: "Review release checklist",
    href: "/life-os/app/tasks/task-1",
    projectName: "LifeOS launch",
    priority: "P1" as const,
    timingLabel: "Due today",
  },
  rankingExplanation: "This Task is overdue and has P1 priority.",
};

describe("TodayNextUp", () => {
  it("stays absent while today's selected focus is still active", () => {
    renderWithUser(<TodayNextUp {...BASE_PROPS} status={{ type: "hidden" }} />);

    expect(screen.queryByRole("heading", { name: "Next up" })).not.toBeInTheDocument();
    expect(screen.queryByText("Open tasks")).not.toBeInTheDocument();
  });

  it("shows the ranked Task with its source, rule, and recorded reason", () => {
    renderWithUser(<TodayNextUp {...BASE_PROPS} status={READY_STATUS} />);

    expect(screen.getByRole("heading", { level: 2, name: "Next up" })).toBeInTheDocument();
    expect(screen.getByText("Shown because no focus is selected for today.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open task: Review release checklist" }),
    ).toHaveAttribute("href", READY_STATUS.task.href);
    expect(screen.getByText("LifeOS launch")).toBeInTheDocument();
    expect(screen.getByText("P1 — High")).toBeInTheDocument();
    expect(screen.getByText("Due today")).toBeInTheDocument();
    expect(screen.getByText("Why this is next")).toBeInTheDocument();
    expect(screen.getByText("This Task is overdue and has P1 priority.")).toBeInTheDocument();
    expect(screen.getByText("Open tasks")).toBeInTheDocument();
    expect(screen.getByText(BASE_PROPS.rankingRule)).toBeInTheDocument();
    expect(screen.queryByText(/\bAI\b/i)).not.toBeInTheDocument();
  });

  it("explains why the widget follows a completed focus", () => {
    renderWithUser(
      <TodayNextUp {...BASE_PROPS} status={{ ...READY_STATUS, availability: "focus-completed" }} />,
    );

    expect(screen.getByText("Shown because today's focus is complete.")).toBeInTheDocument();
  });

  it("starts focus with the ranked Task id and supports a disabled action", async () => {
    const onStartFocus = vi.fn();
    const { user, rerender } = renderWithUser(
      <TodayNextUp {...BASE_PROPS} status={READY_STATUS} onStartFocus={onStartFocus} />,
    );

    await user.click(screen.getByRole("button", { name: "Start focus" }));
    expect(onStartFocus).toHaveBeenCalledWith("task-1");

    rerender(
      <TodayNextUp
        {...BASE_PROPS}
        status={READY_STATUS}
        onStartFocus={onStartFocus}
        startFocusDisabled
      />,
    );
    expect(screen.getByRole("button", { name: "Start focus" })).toBeDisabled();
  });

  it("renders loading, empty, and recoverable error states without hiding provenance", async () => {
    const onRetry = vi.fn();
    const { container, rerender, user } = renderWithUser(
      <TodayNextUp
        {...BASE_PROPS}
        status={{ type: "loading", availability: "no-focus-selected" }}
      />,
    );

    expect(screen.getByRole("status", { name: "Loading next task" })).toBeInTheDocument();
    expect(screen.getByText("Open tasks")).toBeInTheDocument();

    rerender(
      <TodayNextUp {...BASE_PROPS} status={{ type: "empty", availability: "no-focus-selected" }} />,
    );
    expect(screen.getByText("No open task is next")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open tasks" })).toHaveAttribute(
      "href",
      BASE_PROPS.tasksHref,
    );

    rerender(
      <TodayNextUp
        {...BASE_PROPS}
        status={{
          type: "error",
          availability: "no-focus-selected",
          message: "Other Today sections are still available.",
        }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("The next task couldn't load.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await expectNoAccessibilityViolations(container);
  });

  it("has no accessibility violations in the ready state", async () => {
    const { container } = renderWithUser(<TodayNextUp {...BASE_PROPS} status={READY_STATUS} />);
    await expectNoAccessibilityViolations(container);
  });
});
