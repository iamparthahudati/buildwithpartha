import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { TodayPlanTask } from "../model/todayPlan";
import { TodayMitCard, type TodayMitCardProps } from "./TodayMitCard";

const MIT_TASK: TodayPlanTask = {
  id: "task-1",
  title: "Prepare weekly review",
  href: "/life-os/app/tasks/task-1",
  priority: "P1",
  status: "IN_PROGRESS",
  project: { name: "Learning plan", href: "/life-os/app/projects/project-1" },
  dueLabel: "Due today, 20 Aug 2026",
  isMit: true,
};

function props(overrides: Partial<TodayMitCardProps> = {}): TodayMitCardProps {
  return {
    state: { type: "ready", task: MIT_TASK },
    tasksHref: "/life-os/app/tasks",
    onChooseMit: vi.fn(),
    onChangeMit: vi.fn(),
    onMarkDone: vi.fn(),
    onStartFocus: vi.fn(),
    onAddTask: vi.fn(),
    ...overrides,
  };
}

describe("TodayMitCard", () => {
  it("renders the MIT with project, priority, status, due context, and navigation", () => {
    renderWithUser(<TodayMitCard {...props()} />);

    const region = screen.getByRole("region", { name: "Today's focus" });
    expect(within(region).getByRole("link", { name: "Prepare weekly review" })).toHaveAttribute(
      "href",
      MIT_TASK.href,
    );
    expect(within(region).getByRole("link", { name: "Learning plan" })).toHaveAttribute(
      "href",
      MIT_TASK.project?.href,
    );
    expect(within(region).getByText("P1 — High")).toBeInTheDocument();
    expect(within(region).getByText("In progress")).toBeInTheDocument();
    expect(within(region).getByText("Due today, 20 Aug 2026")).toBeInTheDocument();
    expect(within(region).getByText(/Most Important Task/)).toBeInTheDocument();
  });

  it("forwards complete, start, and change actions for the selected Task", async () => {
    const onStartFocus = vi.fn();
    const onMarkDone = vi.fn();
    const onChangeMit = vi.fn();
    const { user } = renderWithUser(
      <TodayMitCard {...props({ onStartFocus, onMarkDone, onChangeMit })} />,
    );

    await user.click(screen.getByRole("button", { name: "Start focus" }));
    await user.click(screen.getByRole("button", { name: "Mark done" }));
    await user.click(screen.getByRole("button", { name: "Change MIT" }));

    expect(onStartFocus).toHaveBeenCalledWith("task-1");
    expect(onMarkDone).toHaveBeenCalledWith("task-1");
    expect(onChangeMit).toHaveBeenCalledWith("task-1");
  });

  it("keeps the active mutation focusable and disables competing mutations", () => {
    renderWithUser(
      <TodayMitCard
        {...props({
          state: { type: "ready", task: { ...MIT_TASK, pendingAction: "start-focus" } },
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "Start focus" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("button", { name: "Start focus" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Mark done" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Change MIT" })).toBeDisabled();
  });

  it("offers choose-focus and add-task actions in the first-use state", async () => {
    const onChooseMit = vi.fn();
    const onAddTask = vi.fn();
    const { user } = renderWithUser(
      <TodayMitCard {...props({ state: { type: "empty" }, onChooseMit, onAddTask })} />,
    );

    expect(screen.getByText("Choose today's focus")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose focus" }));
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(onChooseMit).toHaveBeenCalledTimes(1);
    expect(onAddTask).toHaveBeenCalledTimes(1);
  });

  it("isolates an error with retry and a safe source link", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <TodayMitCard
        {...props({
          state: { type: "error", message: "Other Today sections are still available." },
          onRetry,
        })}
      />,
    );

    expect(screen.getByText("Today's focus couldn't load.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Tasks" })).toHaveAttribute(
      "href",
      "/life-os/app/tasks",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("reserves the card and announces loading once", () => {
    const { container } = renderWithUser(
      <TodayMitCard {...props({ state: { type: "loading" } })} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading today's focus…");
    expect(container.querySelectorAll(".lifeos-skeleton").length).toBeGreaterThan(2);
  });

  it("has no accessibility violations in ready and first-use states", async () => {
    const { container, rerender } = renderWithUser(<TodayMitCard {...props()} />);
    await expectNoAccessibilityViolations(container);

    rerender(<TodayMitCard {...props({ state: { type: "empty" } })} />);
    await expectNoAccessibilityViolations(container);
  });
});
