import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import {
  TimeBlockForm,
  type TimeBlockTaskOption,
  type TimeBlockProjectOption,
} from "./TimeBlockForm";
import type { TimeBlock } from "../model/timeBlock";

const MOCK_TASKS: TimeBlockTaskOption[] = [
  { id: "task-1", title: "Write API Documentation" },
  { id: "task-2", title: "Setup Database Migration" },
];

const MOCK_PROJECTS: TimeBlockProjectOption[] = [
  { id: "proj-1", name: "LifeOS Engine" },
  { id: "proj-2", name: "UI Design System" },
];

const INITIAL_TIME_BLOCK: TimeBlock = {
  id: "tb-101",
  title: "Sprint Planning Block",
  category: "Planning",
  categoryColor: "green",
  categoryIcon: "calendar",
  date: "2026-08-25",
  startTime: "09:00",
  endTime: "10:30",
  timeZone: "UTC",
  status: "SCHEDULED",
  projectId: "proj-1",
  taskId: "task-1",
  notes: "Prepare sprint backlog items",
};

describe("TimeBlockForm", () => {
  it("renders in create mode with default field values and passes accessibility audit", async () => {
    const handleClose = vi.fn();
    const handleSubmit = vi.fn();

    const { container } = renderWithUser(
      <TimeBlockForm
        open={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
        mode="create"
        tasks={MOCK_TASKS}
        projects={MOCK_PROJECTS}
      />,
    );

    expect(screen.getByRole("heading", { name: "Create time block" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Title$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Category$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Date$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Start time$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^End time$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create time block" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders in edit mode pre-populated with initial values", async () => {
    const handleClose = vi.fn();
    const handleSubmit = vi.fn();

    const { container } = renderWithUser(
      <TimeBlockForm
        open={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
        mode="edit"
        initialValues={INITIAL_TIME_BLOCK}
        tasks={MOCK_TASKS}
        projects={MOCK_PROJECTS}
      />,
    );

    expect(screen.getByRole("heading", { name: "Edit time block" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Title$/i)).toHaveValue("Sprint Planning Block");
    expect(screen.getByLabelText(/^Category$/i)).toHaveValue("Planning");
    expect(screen.getByLabelText(/^Date$/i)).toHaveValue("2026-08-25");
    expect(screen.getByLabelText(/^Start time$/i)).toHaveValue("09:00");
    expect(screen.getByLabelText(/^End time$/i)).toHaveValue("10:30");
    expect(screen.getByLabelText(/Linked Project/i)).toHaveValue("proj-1");
    expect(screen.getByLabelText(/Linked Task/i)).toHaveValue("task-1");
    expect(screen.getByLabelText(/Notes/i)).toHaveValue("Prepare sprint backlog items");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("validates required title and focuses error summary when submitting empty", async () => {
    const handleSubmit = vi.fn();

    const { user } = renderWithUser(
      <TimeBlockForm
        open={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        mode="create"
      />,
    );

    const titleInput = screen.getByLabelText(/^Title$/i);
    await user.clear(titleInput);
    await user.click(screen.getByRole("button", { name: "Create time block" }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText("Title is required.")[0]).toBeInTheDocument();
  });

  it("validates that end time is after start time", async () => {
    const handleSubmit = vi.fn();

    const { user } = renderWithUser(
      <TimeBlockForm
        open={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        mode="create"
        initialValues={{
          startTime: "10:00",
          endTime: "09:00",
        }}
      />,
    );

    const titleInput = screen.getByLabelText(/^Title$/i);
    await user.type(titleInput, "Invalid Duration Block");
    await user.click(screen.getByRole("button", { name: "Create time block" }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText("End time must be after start time.")[0]).toBeInTheDocument();
  });

  it("validates DST gap error handling", async () => {
    const handleSubmit = vi.fn();

    const { user } = renderWithUser(
      <TimeBlockForm
        open={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        mode="create"
        initialValues={{
          title: "DST Gap Test",
          date: "2026-03-08" as any,
          startTime: "02:30" as any,
          endTime: "03:30" as any,
          timeZone: "America/New_York",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create time block" }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(/invalid local time during daylight saving transition/i)[0],
    ).toBeInTheDocument();
  });

  it("renders DST fold warning alert", async () => {
    const { user } = renderWithUser(
      <TimeBlockForm
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        mode="create"
        initialValues={{
          title: "DST Fold Test",
          date: "2026-11-01" as any,
          startTime: "01:30" as any,
          endTime: "02:30" as any,
          timeZone: "America/New_York",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create time block" }));

    expect(screen.getByText("Daylight Saving Transition Warning")).toBeInTheDocument();
  });

  it("renders conflict warning alert and handles allowOverlap toggle", async () => {
    const handleResolveConflict = vi.fn();
    const handleSubmit = vi.fn();

    const { user } = renderWithUser(
      <TimeBlockForm
        open={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        mode="create"
        conflictError="Time block overlaps with existing calendar block (09:00 - 10:00)."
        conflictDescriptions={["Overlaps with Team Sync (09:00 - 10:00)"]}
        onResolveConflict={handleResolveConflict}
        initialValues={{
          title: "Overlapping Block",
        }}
      />,
    );

    expect(screen.getByText("Scheduling Conflict Detected")).toBeInTheDocument();
    expect(screen.getByText("Overlaps with Team Sync (09:00 - 10:00)")).toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox", { name: "Allow scheduling despite conflict" });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(handleResolveConflict).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Create time block" }));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Overlapping Block",
        allowOverlap: true,
      }),
    );
  });

  it("submits valid form data correctly", async () => {
    const handleSubmit = vi.fn();

    const { user } = renderWithUser(
      <TimeBlockForm
        open={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        mode="create"
        tasks={MOCK_TASKS}
        projects={MOCK_PROJECTS}
      />,
    );

    await user.type(screen.getByLabelText(/^Title$/i), "Architecture Design Review");
    await user.selectOptions(screen.getByLabelText(/^Category$/i), "Meeting");
    await user.selectOptions(screen.getByLabelText(/Linked Project/i), "proj-1");
    await user.selectOptions(screen.getByLabelText(/Linked Task/i), "task-1");
    await user.type(
      screen.getByLabelText(/Notes/i),
      "Review system architecture specs.",
    );

    await user.click(screen.getByRole("button", { name: "Create time block" }));

    expect(handleSubmit).toHaveBeenCalledWith({
      title: "Architecture Design Review",
      category: "Meeting",
      categoryColor: "purple",
      categoryIcon: "users",
      date: expect.any(String),
      startTime: "09:00",
      endTime: "10:00",
      timeZone: "UTC",
      status: "SCHEDULED",
      projectId: "proj-1",
      taskId: "task-1",
      notes: "Review system architecture specs.",
      allowOverlap: false,
    });
  });

  it("resets state when initialValues change while open", async () => {
    const { rerender } = renderWithUser(
      <TimeBlockForm
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        mode="create"
        initialValues={{ title: "Initial Title" }}
      />,
    );

    expect(screen.getByLabelText(/^Title$/i)).toHaveValue("Initial Title");

    rerender(
      <TimeBlockForm
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        mode="create"
        initialValues={{ title: "Updated Title" }}
      />,
    );

    expect(screen.getByLabelText(/^Title$/i)).toHaveValue("Updated Title");
  });
});
