import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { TodayPlanTask } from "../model/todayPlan";
import { TodayPlan, type TodayPlanProps } from "./TodayPlan";

const TASK: TodayPlanTask = {
  id: "task-1",
  title: "Prepare weekly review",
  href: "/life-os/app/tasks/task-1",
  priority: "P1",
  status: "IN_PROGRESS",
  isMit: true,
};

function props(overrides: Partial<TodayPlanProps> = {}): TodayPlanProps {
  return {
    mitState: { type: "ready", task: TASK },
    tasksState: { type: "ready", tasks: [TASK] },
    onChooseMit: vi.fn(),
    onChangeMit: vi.fn(),
    onSetMit: vi.fn(),
    onMarkDone: vi.fn(),
    onStartFocus: vi.fn(),
    onAddTask: vi.fn(),
    ...overrides,
  };
}

describe("TodayPlan", () => {
  it("orders today's focus before today's tasks inside the plan", () => {
    renderWithUser(<TodayPlan {...props()} />);

    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);
    expect(headings).toEqual(["Today's plan", "Today's focus", "Today's tasks"]);
  });

  it("keeps a usable MIT visible when the task list fails", () => {
    renderWithUser(
      <TodayPlan
        {...props({
          tasksState: { type: "error", message: "The list is temporarily unavailable." },
        })}
      />,
    );

    expect(screen.getAllByRole("link", { name: "Prepare weekly review" }).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Today's tasks couldn't load.")).toBeInTheDocument();
  });

  it("supports independent first-use states without fabricated task data", () => {
    renderWithUser(
      <TodayPlan {...props({ mitState: { type: "empty" }, tasksState: { type: "empty" } })} />,
    );

    expect(screen.getByText("Choose today's focus")).toBeInTheDocument();
    expect(screen.getByText("No tasks planned for today")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("has no accessibility violations in normal and partial-error states", async () => {
    const { container, rerender } = renderWithUser(<TodayPlan {...props()} />);
    await expectNoAccessibilityViolations(container);

    rerender(
      <TodayPlan
        {...props({
          mitState: { type: "error", message: "The focus is temporarily unavailable." },
        })}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
