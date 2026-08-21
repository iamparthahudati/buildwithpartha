import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TasksScreen } from "./TasksScreen";
import { MOCK_TASKS } from "../model/mockTasks";

describe("TasksScreen", () => {
  it("renders the header, metrics, filters and default task table", () => {
    renderWithUser(<TasksScreen />);

    expect(screen.getByRole("heading", { name: "Tasks", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add task" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Task summary" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare weekly review" })).toBeInTheDocument();
    expect(screen.getByText("9 tasks")).toBeInTheDocument();
  });

  it("opens the create dialog from Add task", async () => {
    const { user } = renderWithUser(<TasksScreen />);

    await user.click(screen.getByRole("button", { name: "Add task" }));

    expect(screen.getByRole("heading", { name: "Create task" })).toBeInTheDocument();
  });

  it("filters the list from a summary preset and a status tab", async () => {
    const { user } = renderWithUser(<TasksScreen />);

    await user.click(screen.getByRole("button", { name: "Show Blocked tasks" }));

    expect(screen.getByRole("button", { name: "Finish launch checklist" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Prepare weekly review" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Done" }));

    expect(screen.getByRole("button", { name: "Write retrospective notes" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Finish launch checklist" }),
    ).not.toBeInTheDocument();
  });

  it("searches tasks and can clear the empty result", async () => {
    const { user } = renderWithUser(<TasksScreen />);
    const search = screen.getAllByLabelText("Search tasks")[0]!;

    await user.type(search, "nonexistent query");
    await user.keyboard("{Enter}");

    expect(screen.getByText(/No results for/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(screen.getByRole("button", { name: "Prepare weekly review" })).toBeInTheDocument();
  });

  it("opens a detail panel from a task title", async () => {
    const { user } = renderWithUser(<TasksScreen />);

    await user.click(screen.getByRole("button", { name: "Prepare weekly review" }));

    expect(screen.getByRole("heading", { name: "Prepare weekly review" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open task details" })).toHaveAttribute(
      "href",
      "/life-os/app/tasks/task-weekly-review",
    );
  });

  it("keeps failed bulk selections and names the reason", async () => {
    const { user } = renderWithUser(<TasksScreen simulateBulkFailures={["task-weekly-review"]} />);

    await user.click(screen.getAllByRole("checkbox", { name: "Select Prepare weekly review" })[0]!);
    await user.click(screen.getAllByRole("checkbox", { name: "Select Pay household bills" })[0]!);

    expect(screen.getByText("2 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Archive" }));
    await user.click(screen.getByRole("button", { name: "Archive tasks" }));

    expect(screen.getByText("Some tasks couldn't be updated")).toBeInTheDocument();
    expect(
      screen.getByText(/Prepare weekly review: This task changed. Reload and try again./),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("checkbox", { name: "Select Prepare weekly review" })[0],
    ).toBeChecked();
    expect(
      screen.queryByRole("checkbox", { name: "Select Pay household bills" }),
    ).not.toBeInTheDocument();
  });

  it("renders loading and error states", async () => {
    const onRetry = vi.fn();
    const { user, rerender } = renderWithUser(<TasksScreen loading />);

    expect(screen.getByText("Loading Tasks…")).toBeInTheDocument();

    rerender(<TasksScreen error="The task list is temporarily unavailable." onRetry={onRetry} />);

    expect(screen.getByText("Couldn't load this list.")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Try again" })[0]!);
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders a first-use empty state", () => {
    renderWithUser(<TasksScreen initialTasks={[]} />);

    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.getByText("Add a task when you know what needs action.")).toBeInTheDocument();
  });

  it("has no axe violations in the populated table", async () => {
    const { container } = renderWithUser(<TasksScreen />);
    await expectNoAccessibilityViolations(container);
  });

  it("does not invent records when a caller supplies an empty controlled list", () => {
    renderWithUser(<TasksScreen tasks={[]} loading={false} />);
    expect(screen.queryByRole("button", { name: "Prepare weekly review" })).not.toBeInTheDocument();
    expect(MOCK_TASKS.length).toBeGreaterThan(0);
    expect(
      within(screen.getByRole("region", { name: "Task summary" })).getByText("All"),
    ).toBeInTheDocument();
  });
});
