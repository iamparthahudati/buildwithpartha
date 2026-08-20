import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ProjectTimeline } from "./ProjectTimeline";
import type { Milestone } from "../model/milestone";

const MOCK_MILESTONES: readonly Milestone[] = [
  {
    id: "m1",
    projectId: "project-1",
    title: "Phase 1 Foundation Baseline",
    date: "2026-08-10",
    status: "COMPLETED",
    ordering: 1,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-10T15:00:00Z",
    version: 1,
  },
  {
    id: "m2",
    projectId: "project-1",
    title: "Overdue Review Checkpoint",
    date: "2026-08-15",
    status: "PLANNED",
    ordering: 2,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
    version: 1,
  },
  {
    id: "m3",
    projectId: "project-1",
    title: "Production Gate",
    date: "2026-09-01",
    status: "PLANNED",
    ordering: 3,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
    version: 1,
  },
];

const NOW = new Date("2026-08-20T17:00:00Z");

describe("ProjectTimeline", () => {
  it("renders populated milestones timeline with stats and statuses", async () => {
    const { container } = renderWithUser(
      <ProjectTimeline
        projectId="project-1"
        milestones={MOCK_MILESTONES}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
        onAddMilestone={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Milestones & Timeline" }),
    ).toBeInTheDocument();
    expect(screen.getByText("3 total")).toBeInTheDocument();
    expect(screen.getByText("1 completed")).toBeInTheDocument();
    expect(screen.getByText("1 overdue")).toBeInTheDocument();

    expect(
      screen.getAllByRole("heading", { level: 3, name: "Phase 1 Foundation Baseline" })[0],
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 3, name: "Overdue Review Checkpoint" })[0],
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 3, name: "Production Gate" })[0],
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Add milestone" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders empty state when no milestones exist", async () => {
    const onAddMilestone = vi.fn();
    const { container } = renderWithUser(
      <ProjectTimeline milestones={[]} onAddMilestone={onAddMilestone} />,
    );

    expect(screen.getByText("No milestones yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add key checkpoints and target dates to track progress along your project timeline.",
      ),
    ).toBeInTheDocument();

    const addButtons = screen.getAllByRole("button", { name: "Add milestone" });
    expect(addButtons.length).toBeGreaterThan(0);

    await expectNoAccessibilityViolations(container);
  });

  it("renders loading skeleton state when loading is true", async () => {
    const { container } = renderWithUser(<ProjectTimeline loading />);

    expect(screen.getByText("Loading project timeline and milestones.")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders error state when error is provided", async () => {
    const onRetry = vi.fn();
    const { container, user } = renderWithUser(
      <ProjectTimeline error="Network failure" onRetry={onRetry} />,
    );

    expect(screen.getByText("Failed to load project milestones")).toBeInTheDocument();
    expect(screen.getByText("Network failure")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Try again" });
    await user.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);

    await expectNoAccessibilityViolations(container);
  });

  it("opens add milestone dialog and submits new milestone data", async () => {
    const onAddMilestone = vi.fn();
    const { user } = renderWithUser(
      <ProjectTimeline
        projectId="project-1"
        milestones={MOCK_MILESTONES}
        onAddMilestone={onAddMilestone}
      />,
    );

    const addBtn = screen.getByRole("button", { name: "Add milestone" });
    await user.click(addBtn);

    const dialog = screen.getByRole("dialog", { name: "Add milestone" });
    expect(dialog).toBeInTheDocument();

    const titleInput = screen.getByRole("textbox", { name: "Title" });
    await user.type(titleInput, "Beta Launch");

    const submitBtn = screen.getAllByRole("button", { name: "Add milestone" })[1];
    expect(submitBtn).toBeDefined();
    await user.click(submitBtn!);

    expect(onAddMilestone).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Beta Launch",
        status: "PLANNED",
      }),
    );
  });

  it("triggers status change and delete actions from item menu", async () => {
    const onStatusChange = vi.fn();
    const onDeleteMilestone = vi.fn();

    const { user } = renderWithUser(
      <ProjectTimeline
        projectId="project-1"
        milestones={MOCK_MILESTONES}
        onStatusChange={onStatusChange}
        onDeleteMilestone={onDeleteMilestone}
      />,
    );

    const actionMenuBtns = screen.getAllByRole("button", { name: /Actions for/i });
    const firstBtn = actionMenuBtns[0];
    const secondBtn = actionMenuBtns[1];
    expect(firstBtn).toBeDefined();
    expect(secondBtn).toBeDefined();

    await user.click(firstBtn!); // First milestone: Phase 1 Foundation Baseline (COMPLETED)

    const markPlannedItem = screen.getByRole("menuitem", { name: "Mark planned" });
    await user.click(markPlannedItem);
    expect(onStatusChange).toHaveBeenCalledWith("m1", "PLANNED");

    // Open menu on second milestone to test delete
    await user.click(secondBtn!);
    const deleteItem = screen.getByRole("menuitem", { name: "Delete milestone" });
    await user.click(deleteItem);

    // Confirmation dialog should open
    expect(screen.getByRole("heading", { name: "Delete milestone" })).toBeInTheDocument();
    const confirmDeleteBtn = screen.getByRole("button", { name: "Delete milestone" });
    await user.click(confirmDeleteBtn);

    expect(onDeleteMilestone).toHaveBeenCalledWith("m2");
  });

  it("edits milestone and validates target date boundaries", async () => {
    const onUpdateMilestone = vi.fn();

    const { user } = renderWithUser(
      <ProjectTimeline
        projectId="project-1"
        milestones={MOCK_MILESTONES}
        projectStartDate="2026-08-01"
        projectDeadlineDate="2026-08-31"
        onUpdateMilestone={onUpdateMilestone}
      />,
    );

    const actionMenuBtns = screen.getAllByRole("button", { name: /Actions for/i });
    const firstBtn = actionMenuBtns[0];
    expect(firstBtn).toBeDefined();
    await user.click(firstBtn!);

    const editItem = screen.getByRole("menuitem", { name: "Edit milestone" });
    await user.click(editItem);

    expect(screen.getByRole("heading", { name: "Edit milestone" })).toBeInTheDocument();

    const dateInput = screen.getByLabelText(/Target Date/i);
    // Set invalid date before project start date
    await user.clear(dateInput);
    await user.type(dateInput, "2026-07-15");

    const saveBtn = screen.getByRole("button", { name: "Save changes" });
    await user.click(saveBtn);

    expect(
      screen.getAllByText("Milestone date cannot be before project start date (2026-08-01).")[0],
    ).toBeInTheDocument();

    // Fix date and submit
    await user.clear(dateInput);
    await user.type(dateInput, "2026-08-25");
    await user.click(saveBtn);

    expect(onUpdateMilestone).toHaveBeenCalledWith(
      "m1",
      expect.objectContaining({
        date: "2026-08-25",
      }),
    );
  });
});
