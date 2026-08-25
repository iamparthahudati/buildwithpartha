import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import type { LocalDate } from "@lib/localDateTime";

import type { SprintScreenRecord } from "./SprintsScreen";
import { SprintsScreen } from "./SprintsScreen";

const RECORDS: readonly SprintScreenRecord[] = [
  {
    sprint: {
      id: "active-1",
      name: "Active Sprint",
      startDate: "2026-08-25" as LocalDate,
      endDate: "2026-08-31" as LocalDate,
      status: "ACTIVE",
      targetCapacityPoints: 8,
      totalStoryPoints: 5,
      completedStoryPoints: 2,
      version: 3,
    },
    tasks: [],
    events: [],
  },
  {
    sprint: {
      id: "planned-1",
      name: "Next Sprint",
      startDate: "2026-09-01" as LocalDate,
      endDate: "2026-09-07" as LocalDate,
      status: "PLANNED",
      targetCapacityPoints: 10,
      totalStoryPoints: 0,
      completedStoryPoints: 0,
      version: 1,
    },
    tasks: [],
    events: [],
  },
];

describe("SprintsScreen", () => {
  it("renders URL-controlled views and confirms Sprint start", async () => {
    const onViewChange = vi.fn();
    const onStartSprint = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <SprintsScreen
        records={RECORDS}
        view="upcoming"
        onViewChange={onViewChange}
        onCreateSprint={vi.fn()}
        onStartSprint={onStartSprint}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Sprints" })).toBeInTheDocument();
    expect(screen.getByText("Next Sprint")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Active (1)" }));
    expect(onViewChange).toHaveBeenCalledWith("active");

    await userEvent.click(screen.getByRole("button", { name: "Start Sprint" }));
    expect(screen.getByText(/Only one Sprint can be active/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Start Sprint" })[1]!);
    expect(onStartSprint).toHaveBeenCalledWith(RECORDS[1]?.sprint);

    await expectNoAccessibilityViolations(container);
  });

  it("opens planned scope management with add, edit, and remove controls", async () => {
    render(
      <SprintsScreen
        records={[
          {
            ...RECORDS[1]!,
            tasks: [
              {
                id: "commitment-1",
                sprintId: "planned-1",
                taskId: "task-1",
                title: "Verify Sprint planning",
                status: "TO_DO",
                storyPoints: 3,
                isCommitted: true,
              },
            ],
          },
        ]}
        view="upcoming"
        taskOptions={[
          { id: "task-1", label: "Verify Sprint planning" },
          { id: "task-2", label: "Document the handoff" },
        ]}
        onAddTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onRemoveTask={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Plan Scope" }));
    expect(screen.getByRole("dialog", { name: "Manage scope — Next Sprint" })).toBeInTheDocument();
    expect(screen.getByText("Verify Sprint planning")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add Task" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Verify Sprint planning commitment" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Verify Sprint planning from sprint" }),
    ).toBeInTheDocument();
  });

  it("completes the create, edit, scope, remove, and retrospective interaction paths", async () => {
    const onCreateSprint = vi.fn().mockResolvedValue(undefined);
    const onUpdateSprint = vi.fn().mockResolvedValue(undefined);
    const onAddTask = vi.fn().mockResolvedValue(undefined);
    const onUpdateTask = vi.fn().mockResolvedValue(undefined);
    const onRemoveTask = vi.fn().mockResolvedValue(undefined);
    const onCompleteSprint = vi.fn().mockResolvedValue(undefined);
    const plannedWithTask: SprintScreenRecord = {
      ...RECORDS[1]!,
      tasks: [
        {
          id: "commitment-1",
          sprintId: "planned-1",
          taskId: "task-1",
          title: "Verify Sprint planning",
          status: "TO_DO",
          storyPoints: 3,
          isCommitted: true,
        },
      ],
    };
    const props = {
      records: [RECORDS[0]!, plannedWithTask],
      taskOptions: [
        { id: "task-1", label: "Verify Sprint planning" },
        { id: "task-2", label: "Document the handoff" },
      ],
      onCreateSprint,
      onUpdateSprint,
      onAddTask,
      onUpdateTask,
      onRemoveTask,
      onCompleteSprint,
    } as const;
    const { rerender } = render(<SprintsScreen {...props} view="upcoming" />);

    await userEvent.click(screen.getByRole("button", { name: "Plan a Sprint" }));
    const createDialog = screen.getByRole("dialog", { name: "Create Sprint" });
    await userEvent.type(within(createDialog).getByLabelText("Sprint Name"), "October Sprint");
    await userEvent.type(within(createDialog).getByLabelText("Start Date"), "2026-10-01");
    await userEvent.type(within(createDialog).getByLabelText("End Date"), "2026-10-07");
    await userEvent.click(within(createDialog).getByRole("button", { name: "Create Sprint" }));
    expect(onCreateSprint).toHaveBeenCalledWith(
      expect.objectContaining({ name: "October Sprint", targetCapacityPoints: 20 }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Edit Details" }));
    const editDialog = screen.getByRole("dialog", { name: "Edit Sprint" });
    await userEvent.clear(within(editDialog).getByLabelText(/Sprint Goal/));
    await userEvent.type(within(editDialog).getByLabelText(/Sprint Goal/), "Protect the scope");
    await userEvent.click(within(editDialog).getByRole("button", { name: "Save Changes" }));
    expect(onUpdateSprint).toHaveBeenCalledWith(
      plannedWithTask.sprint,
      expect.objectContaining({ goal: "Protect the scope" }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Plan Scope" }));
    const scopeDialog = screen.getByRole("dialog", { name: "Manage scope — Next Sprint" });
    await userEvent.click(within(scopeDialog).getByRole("button", { name: "+ Add Task" }));
    const addDialog = screen.getByRole("dialog", { name: "Add Task to Sprint" });
    await userEvent.selectOptions(within(addDialog).getByLabelText("Task"), "task-2");
    await userEvent.clear(within(addDialog).getByLabelText("Story Points"));
    await userEvent.type(within(addDialog).getByLabelText("Story Points"), "5");
    await userEvent.type(
      within(addDialog).getByLabelText(/Reason for scope change/),
      "Required documentation",
    );
    await userEvent.click(within(addDialog).getByRole("button", { name: "Add Task to Sprint" }));
    expect(onAddTask).toHaveBeenCalledWith(
      plannedWithTask.sprint,
      {
        taskId: "task-2",
        storyPoints: 5,
        reason: "Required documentation",
      },
      1,
    );

    await userEvent.click(
      within(scopeDialog).getByRole("button", {
        name: "Edit Verify Sprint planning commitment",
      }),
    );
    const editTaskDialog = screen.getByRole("dialog", {
      name: "Edit commitment — Verify Sprint planning",
    });
    await userEvent.clear(within(editTaskDialog).getByLabelText("Story Points"));
    await userEvent.type(within(editTaskDialog).getByLabelText("Story Points"), "4");
    await userEvent.click(
      within(editTaskDialog).getByRole("button", { name: "Update commitment" }),
    );
    expect(onUpdateTask).toHaveBeenCalledWith(
      plannedWithTask.sprint,
      plannedWithTask.tasks[0],
      { taskId: "task-1", storyPoints: 4 },
      0,
    );

    await userEvent.click(
      within(scopeDialog).getByRole("button", {
        name: "Remove Verify Sprint planning from sprint",
      }),
    );
    const removeDialog = screen.getByRole("dialog", {
      name: "Remove “Verify Sprint planning” from this Sprint?",
    });
    await userEvent.click(within(removeDialog).getByRole("button", { name: "Remove from Sprint" }));
    expect(onRemoveTask).toHaveBeenCalledWith(plannedWithTask.sprint, plannedWithTask.tasks[0]);
    await userEvent.click(within(scopeDialog).getByRole("button", { name: "Close" }));

    rerender(<SprintsScreen {...props} view="active" />);
    await userEvent.click(screen.getByRole("button", { name: "Complete & Retrospective" }));
    const completeDialog = screen.getByRole("dialog", { name: "Complete Sprint — Active Sprint" });
    await userEvent.type(within(completeDialog).getByLabelText(/What went well/), "Clear scope");
    await userEvent.click(within(completeDialog).getByRole("button", { name: "Complete Sprint" }));
    expect(onCompleteSprint).toHaveBeenCalledWith(
      RECORDS[0]!.sprint,
      expect.objectContaining({
        whatWentWell: "Clear scope",
        carryOverDestination: "NEXT_SPRINT",
        targetSprintId: "planned-1",
      }),
    );
  });
});
