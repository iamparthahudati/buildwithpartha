import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TaskForm, type TaskFormData, type TaskFormProps } from "./TaskForm";

const PROJECTS = [
  { id: "project-1", name: "Portfolio refresh" },
  { id: "project-2", name: "Home records cleanup" },
] as const;

const LABELS = [
  { id: "label-1", name: "Deep work" },
  { id: "label-2", name: "Weekly planning" },
] as const;

function renderTaskForm(overrides: Partial<TaskFormProps> = {}) {
  const props: TaskFormProps = {
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    timeZone: "Asia/Kolkata",
    locale: "en-IN",
    projects: PROJECTS,
    labels: LABELS,
    ...overrides,
  };
  return { props, ...renderWithUser(<TaskForm {...props} />) };
}

describe("TaskForm", () => {
  it("renders the canonical create fields and defaults", async () => {
    const { container } = renderTaskForm();

    expect(screen.getByRole("heading", { name: "Create task" })).toBeInTheDocument();
    expect(screen.getByLabelText("Task title")).toHaveFocus();
    expect(screen.getByLabelText("Project (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Status")).toHaveValue("TO_DO");
    expect(screen.getByLabelText("Priority")).toHaveValue("P2");
    expect(screen.getByLabelText("Progress")).toHaveValue(0);
    expect(screen.getByRole("combobox", { name: "Labels (optional)" })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Make this the Most Important Task \(MIT\)/ }),
    ).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("keeps Quick Add compact until all options are requested", async () => {
    const { user } = renderTaskForm({ presentation: "quick-add" });

    expect(screen.getByRole("heading", { name: "Add task" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Description (optional)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show all task options" }));

    expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });

  it("submits normalized Task data and converts the local due time to UTC", async () => {
    const onSubmit = vi.fn();
    const { user } = renderTaskForm({ onSubmit });

    await user.type(screen.getByLabelText("Task title"), "  Prepare weekly review  ");
    await user.selectOptions(screen.getByLabelText("Project (optional)"), "project-1");
    await user.type(screen.getByLabelText("Description (optional)"), "  Review open work  ");
    await user.selectOptions(screen.getByLabelText("Status"), "IN_PROGRESS");
    await user.selectOptions(screen.getByLabelText("Priority"), "P1");
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-08-22" } });
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "09:30" } });
    fireEvent.change(screen.getByLabelText("Hours"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Minutes"), { target: { value: "30" } });
    await user.clear(screen.getByLabelText("Progress"));
    await user.type(screen.getByLabelText("Progress"), "45");
    await user.click(screen.getByRole("combobox", { name: "Labels (optional)" }));
    await user.click(screen.getByRole("option", { name: "Deep work" }));
    await user.click(
      screen.getByRole("checkbox", { name: /Make this the Most Important Task \(MIT\)/ }),
    );
    await user.click(screen.getByRole("button", { name: "Add task" }));

    expect(onSubmit).toHaveBeenCalledWith({
      projectId: "project-1",
      title: "Prepare weekly review",
      description: "Review open work",
      status: "IN_PROGRESS",
      priority: "P1",
      dueAt: "2026-08-22T04:00:00.000Z",
      estimateMinutes: 90,
      progress: 45,
      mitDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      labelIds: ["label-1"],
    });
  });

  it("shows and focuses a linked error summary after invalid submit", async () => {
    const onSubmit = vi.fn();
    const { user } = renderTaskForm({ onSubmit });

    await user.click(screen.getByRole("button", { name: "Add task" }));

    const summary = await screen.findByRole("alert", {
      name: "Fix the following before continuing",
    });
    expect(summary).toHaveFocus();
    expect(
      within(summary).getByRole("button", { name: "Enter a task title." }),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(within(summary).getByRole("button", { name: "Enter a task title." }));
    expect(screen.getByLabelText("Task title")).toHaveFocus();
  });

  it("rejects a partial due value and links it from the error summary", async () => {
    const { user } = renderTaskForm();
    await user.type(screen.getByLabelText("Task title"), "Schedule review");
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-08-22" } });

    await user.click(screen.getByRole("button", { name: "Add task" }));

    const summary = await screen.findByRole("alert", {
      name: "Fix the following before continuing",
    });
    const errorLink = within(summary).getByRole("button", {
      name: "Choose both a due date and time, or clear both.",
    });
    await user.click(errorLink);
    expect(screen.getByRole("group", { name: "Due date (optional)" })).toHaveFocus();
  });

  it("rejects nonexistent local due times and out-of-range progress", async () => {
    const { user } = renderTaskForm({ timeZone: "America/New_York" });
    await user.type(screen.getByLabelText("Task title"), "Transition check");
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-03-08" } });
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "02:30" } });
    await user.clear(screen.getByLabelText("Progress"));
    await user.type(screen.getByLabelText("Progress"), "101");

    await user.click(screen.getByRole("button", { name: "Add task" }));

    expect(
      screen.getAllByText(/This time does not exist in America\/New_York/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Enter progress as a whole number from 0 to 100.").length,
    ).toBeGreaterThan(0);
  });

  it("pre-populates edit values in the confirmed timezone and preserves identity", async () => {
    const onSubmit = vi.fn();
    const initialValues: TaskFormData = {
      id: "task-1",
      projectId: "project-2",
      title: "Review records",
      description: "Confirm retention",
      status: "IN_PROGRESS",
      priority: "P3",
      dueAt: "2026-08-22T04:00:00.000Z",
      estimateMinutes: 75,
      progress: 25,
      mitDate: "2026-08-24",
      labelIds: ["label-2"],
      version: 7,
    };
    const { user } = renderTaskForm({ mode: "edit", initialValues, onSubmit });

    expect(screen.getByLabelText("Date")).toHaveValue("2026-08-22");
    expect(screen.getByLabelText("Time")).toHaveValue("09:30");
    expect(screen.getByLabelText("Hours")).toHaveValue(1);
    expect(screen.getByLabelText("Minutes")).toHaveValue(15);
    expect(screen.getByText("Weekly planning")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Keep this as the Most Important Task/ }),
    ).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Save task" }));

    expect(onSubmit).toHaveBeenCalledWith(initialValues);
  });

  it("does not allow terminal tasks to retain an MIT designation", () => {
    renderTaskForm({
      mode: "edit",
      initialValues: {
        title: "Finished review",
        status: "DONE",
        mitDate: "2026-08-21",
      },
    });

    const mit = screen.getByRole("checkbox", { name: /Keep this as the Most Important Task/ });
    expect(mit).toBeDisabled();
    expect(mit).not.toBeChecked();
    expect(screen.getByText(/Done and cancelled tasks cannot be/)).toBeInTheDocument();
  });

  it("blocks stale submission and offers a conflict reload action", async () => {
    const onSubmit = vi.fn();
    const onReloadLatest = vi.fn();
    const { user } = renderTaskForm({
      mode: "edit",
      initialValues: { title: "Review records" },
      onSubmit,
      conflictError: "A newer version is available. Reload it before continuing.",
      onReloadLatest,
    });

    expect(screen.getByRole("button", { name: "Save task" })).toBeDisabled();
    expect(screen.getByLabelText("Task title")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Reload latest task" }));
    expect(onReloadLatest).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("guards dirty dismissal through the shared discard confirmation", async () => {
    const onClose = vi.fn();
    const { user } = renderTaskForm({ onClose });
    await user.type(screen.getByLabelText("Task title"), "New task");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("dialog", { name: "Discard unsaved changes?" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
