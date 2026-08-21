import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TaskSummaryMetrics, type TaskSummaryCounts } from "./TaskSummaryMetrics";

const COUNTS: TaskSummaryCounts = {
  total: 24,
  toDo: 8,
  inProgress: 5,
  done: 7,
  blocked: 3,
  overdue: 1,
};

describe("TaskSummaryMetrics", () => {
  it("renders all six accessible labels and count values", () => {
    renderWithUser(<TaskSummaryMetrics status={{ type: "ready", counts: COUNTS }} />);

    for (const label of ["All", "To Do", "In progress", "Done", "Blocked", "Overdue"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const count of ["24", "8", "5", "7", "3", "1"]) {
      expect(screen.getByText(count)).toBeInTheDocument();
    }
    expect(screen.getByRole("region", { name: "Task summary" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "All: 24. To Do: 8. In progress: 5. Done: 7. Blocked: 3. Overdue: 1",
    );
  });

  it("exposes uniquely named actions and reports the active preset with aria-pressed", async () => {
    const onSelectPreset = vi.fn();
    const { user } = renderWithUser(
      <TaskSummaryMetrics
        status={{ type: "ready", counts: COUNTS }}
        activePreset="IN_PROGRESS"
        onSelectPreset={onSelectPreset}
      />,
    );

    expect(screen.getByRole("button", { name: "Show In progress tasks" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Show all tasks" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(screen.getByRole("button", { name: "Show Overdue tasks" }));
    expect(onSelectPreset).toHaveBeenCalledWith("OVERDUE");
  });

  it("renders six labelled skeletons and marks the region busy while loading", () => {
    const { container } = renderWithUser(<TaskSummaryMetrics status={{ type: "loading" }} />);

    expect(container.querySelectorAll(".lifeos-skeleton")).toHaveLength(6);
    expect(screen.getByRole("region", { name: "Task summary" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading task counts…");
  });

  it("presents a no-tasks state as truthful zero values", () => {
    renderWithUser(<TaskSummaryMetrics status={{ type: "empty" }} />);

    expect(screen.getAllByText("0")).toHaveLength(6);
    expect(screen.getByRole("status")).toHaveTextContent("No tasks yet.");
  });

  it("renders an error on every affected metric but only one retry action", async () => {
    const onRetry = vi.fn();
    const { container, user } = renderWithUser(
      <TaskSummaryMetrics
        status={{ type: "error", message: "Couldn't load task counts.", onRetry }}
      />,
    );

    expect(container.querySelectorAll(".lifeos-inline-message")).toHaveLength(6);
    expect(screen.getByRole("status")).toHaveTextContent("Couldn't load task counts.");
    const retry = screen.getByRole("button", { name: "Try again" });
    await user.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps controlled preset actions available without count data and can disable them", () => {
    const { rerender } = renderWithUser(
      <TaskSummaryMetrics status={{ type: "loading" }} onSelectPreset={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Show all tasks" })).toBeEnabled();

    rerender(
      <TaskSummaryMetrics status={{ type: "loading" }} onSelectPreset={() => {}} disabled />,
    );
    for (const button of screen.getAllByRole("button", { name: /show .*tasks/i })) {
      expect(button).toBeDisabled();
    }
  });

  it("has no accessibility violations across ready, loading, empty and error states", async () => {
    const { container, rerender } = renderWithUser(
      <TaskSummaryMetrics
        status={{ type: "ready", counts: COUNTS }}
        activePreset="BLOCKED"
        onSelectPreset={() => {}}
      />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(<TaskSummaryMetrics status={{ type: "loading" }} />);
    await expectNoAccessibilityViolations(container);

    rerender(<TaskSummaryMetrics status={{ type: "empty" }} />);
    await expectNoAccessibilityViolations(container);

    rerender(
      <TaskSummaryMetrics
        status={{ type: "error", message: "Couldn't load task counts.", onRetry: () => {} }}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
