import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { NoteForm, type NoteFormProps } from "./NoteForm";

const MOCK_LABELS = [
  { id: "label-1", name: "Work" },
  { id: "label-2", name: "Personal" },
];

const MOCK_PROJECTS = [{ id: "proj-1", title: "Project Alpha" }];
const MOCK_TASKS = [{ id: "task-1", title: "Write documentation" }];
const MOCK_GOALS = [{ id: "goal-1", title: "Complete Q3 planning" }];

describe("NoteForm", () => {
  const renderForm = (overrides: Partial<NoteFormProps> = {}) => {
    const props: NoteFormProps = {
      onSubmit: vi.fn(),
      labels: MOCK_LABELS,
      availableProjects: MOCK_PROJECTS,
      availableTasks: MOCK_TASKS,
      availableGoals: MOCK_GOALS,
      ...overrides,
    };
    return { props, ...render(<NoteForm {...props} />) };
  };

  it("renders form elements and default values correctly", async () => {
    const { container } = renderForm();

    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.getByLabelText("Body")).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Labels" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("populates existing note details", () => {
    const note = {
      id: "note-1",
      userId: "user-1",
      title: "Existing Title",
      body: "Existing Body",
      pinned: false,
      archived: false,
      createdAt: "",
      updatedAt: "",
      labelIds: ["label-1"],
      links: [],
      version: 1,
    };

    renderForm({ note });

    expect(screen.getByLabelText("Title")).toHaveValue("Existing Title");
    expect(screen.getByLabelText("Body")).toHaveValue("Existing Body");
  });

  it("submits the form data on Save Note click", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await userEvent.type(screen.getByLabelText("Title"), "My New Note");
    await userEvent.type(screen.getByLabelText("Body"), "This is a brand new note.");

    await userEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "My New Note",
      body: "This is a brand new note.",
      labelIds: [],
      links: [],
    });
  });

  it("triggers debounced autosave when fields change", async () => {
    vi.useFakeTimers();
    try {
      const onSubmit = vi.fn();
      renderForm({ onSubmit });

      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Autosave Note" } });

      // Fast-forward timers by 1.5s
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(onSubmit).toHaveBeenCalledWith({
        title: "Autosave Note",
        body: "",
        labelIds: [],
        links: [],
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("handles adding and removing entity links", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    // Link a project
    await userEvent.selectOptions(screen.getByLabelText("Link Type"), "PROJECT");
    await userEvent.click(screen.getByRole("combobox", { name: "Target Entity" }));
    await userEvent.click(screen.getByRole("option", { name: "Project Alpha" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Link" }));

    expect(screen.getByText(/Project Alpha/)).toBeInTheDocument();

    // Link a task
    await userEvent.selectOptions(screen.getByLabelText("Link Type"), "TASK");
    await userEvent.click(screen.getByRole("combobox", { name: "Target Entity" }));
    await userEvent.click(screen.getByRole("option", { name: "Write documentation" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Link" }));

    expect(screen.getByText(/Write documentation/)).toBeInTheDocument();

    // Remove the project link
    const removeButtons = screen.getAllByRole("button", { name: "Remove link" });
    await userEvent.click(removeButtons[0]!);

    expect(screen.queryByText(/Project Alpha/)).not.toBeInTheDocument();
    expect(screen.getByText(/Write documentation/)).toBeInTheDocument();
  });

  it("renders conflict alert and triggers resolution actions", async () => {
    const onResolveConflict = vi.fn();
    renderForm({
      status: { type: "conflict", message: "Stale version" },
      onResolveConflict,
    });

    expect(screen.getByText("Sync conflict")).toBeInTheDocument();
    expect(screen.getByText("Stale version")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Use Server Version" }));
    expect(onResolveConflict).toHaveBeenCalledWith("server");

    await userEvent.click(screen.getByRole("button", { name: "Use My Draft" }));
    expect(onResolveConflict).toHaveBeenCalledWith("draft");
  });

  it("labels offline edits as unsaved instead of implying durable storage", async () => {
    const { container } = renderForm({
      isOnline: false,
      status: { type: "offline-unsaved" },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Not saved — reconnect and choose Save note",
    );
    expect(screen.queryByText(/queued|saved on this device/i)).not.toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });
});
