import { useState } from "react";
import { screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import { ToastProvider } from "@state/ToastProvider";
import { ToastViewport } from "./ToastViewport";

import { QuickAddDialog, type QuickAddDialogProps, type QuickAddType } from "./QuickAddDialog";
import { useQuickAddShortcut } from "./useQuickAddShortcut";

function QuickAddHarness({
  initialOpen = true,
  initialType,
  dialogProps = {},
}: {
  readonly initialOpen?: boolean;
  readonly initialType?: QuickAddType;
  readonly dialogProps?: Partial<QuickAddDialogProps>;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <ToastProvider>
      <MemoryRouter>
        <button type="button" onClick={() => setOpen(true)}>
          Open trigger
        </button>
        <QuickAddDialog
          open={open}
          onClose={() => setOpen(false)}
          timeZone="Asia/Kolkata"
          {...(initialType ? { initialType } : {})}
          {...dialogProps}
        />
        <ToastViewport />
      </MemoryRouter>
    </ToastProvider>
  );
}

function ShortcutHarness() {
  const [open, setOpen] = useState(false);
  useQuickAddShortcut(() => setOpen(true), { enabled: !open });
  return (
    <ToastProvider>
      <MemoryRouter>
        <input data-testid="test-input" type="text" />
        <textarea data-testid="test-textarea" />
        <QuickAddDialog open={open} onClose={() => setOpen(false)} timeZone="Asia/Kolkata" />
        <ToastViewport />
      </MemoryRouter>
    </ToastProvider>
  );
}

describe("QuickAddDialog", () => {
  let onlineSpy: any;

  beforeEach(() => {
    onlineSpy = vi.spyOn(navigator, "onLine", "get");
    onlineSpy.mockReturnValue(true);
  });

  afterEach(() => {
    onlineSpy.mockRestore();
  });

  it("renders nothing when closed", () => {
    renderWithUser(<QuickAddHarness initialOpen={false} />);
    expect(screen.queryByRole("dialog", { name: "Quick Add" })).not.toBeInTheDocument();
  });

  it("opens the dialog and focuses the active type button (Task) by default", async () => {
    renderWithUser(<QuickAddHarness />);
    const dialog = screen.getByRole("dialog", { name: "Quick Add" });
    expect(dialog).toBeInTheDocument();

    const taskBtn = within(dialog).getByRole("button", { name: "Task" });
    expect(taskBtn).toHaveFocus();
  });

  it("opens directly on a caller-requested creation type", () => {
    renderWithUser(<QuickAddHarness initialType="time-block" />);

    expect(screen.getByRole("button", { name: "Time Block" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Add time block" })).toBeInTheDocument();
    expect(screen.getByLabelText("Start Time")).toBeInTheDocument();
  });

  it("focuses the More selector for a requested Project form", () => {
    renderWithUser(<QuickAddHarness initialType="project" />);

    expect(screen.getByLabelText("More creation types")).toHaveFocus();
    expect(screen.getByLabelText("More creation types")).toHaveValue("project");
    expect(screen.getByLabelText("Project Name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create project" })).toBeInTheDocument();
  });

  it("validates required fields on submit and displays error summary", async () => {
    const { user } = renderWithUser(<QuickAddHarness />);

    // Click submit immediately (Task Title is empty)
    const submitBtn = screen.getByRole("button", { name: "Add task" });
    await user.click(submitBtn);

    // Should see error message and summary (wait for async registration)
    const summary = await screen.findByRole("alert", {
      name: "Fix the following before continuing",
    });
    expect(summary).toBeInTheDocument();
    expect(within(summary).getByRole("button", { name: "Title is required." })).toBeInTheDocument();

    // Verify focus moved to summary
    expect(summary).toHaveFocus();
  });

  it("fills the task form, submits successfully, triggers toast, and closes", async () => {
    const { user } = renderWithUser(<QuickAddHarness />);

    // Fill Title
    const titleInput = screen.getByLabelText("Title");
    await user.type(titleInput, "Submit final report");

    // Select Priority
    const prioritySelect = screen.getByLabelText("Priority (optional)");
    await user.selectOptions(prioritySelect, "P1");

    // Click Submit
    const submitBtn = screen.getByRole("button", { name: "Add task" });
    await user.click(submitBtn);

    // Verify loading state
    expect(submitBtn).toHaveAttribute("aria-busy", "true");

    // Wait for mock API resolve and verify dialog closes and toast is visible
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Toast check
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent('Task "Submit final report" created successfully');
  });

  it("simulates a server error if the title is force-fail, preserving values", async () => {
    const { user } = renderWithUser(<QuickAddHarness />);

    const titleInput = screen.getByLabelText("Title");
    await user.type(titleInput, "force-fail");

    const submitBtn = screen.getByRole("button", { name: "Add task" });
    await user.click(submitBtn);

    // Wait for server error display
    await screen.findByText(
      "We couldn't save this Task. Your fields remain here.",
      {},
      { timeout: 2000 },
    );

    // Dialog stays open and title value is preserved
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("force-fail");
  });

  it("retains individual form state when switching types in the same session", async () => {
    const { user } = renderWithUser(<QuickAddHarness />);

    // Type in Task title
    await user.type(screen.getByLabelText("Title"), "Finish chores");

    // Switch to Brain Dump
    await user.click(screen.getByRole("button", { name: "Brain Dump" }));
    const dumpText = screen.getByLabelText("Content");
    await user.type(dumpText, "A quick floating idea");

    // Switch back to Task, verify Task title is retained
    await user.click(screen.getByRole("button", { name: "Task" }));
    expect(screen.getByLabelText("Title")).toHaveValue("Finish chores");

    // Switch to Brain Dump, verify content is retained
    await user.click(screen.getByRole("button", { name: "Brain Dump" }));
    expect(screen.getByLabelText("Content")).toHaveValue("A quick floating idea");
  });

  it("uses the canonical Note create service and closes only after confirmation", async () => {
    const onCreateNote = vi.fn().mockResolvedValue(undefined);
    const { user } = renderWithUser(
      <QuickAddHarness initialType="note" dialogProps={{ onCreateNote }} />,
    );

    await user.type(screen.getByLabelText("Title"), "Release notes");
    await user.type(screen.getByLabelText("Content (optional)"), "Confirmed details");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    await waitFor(() =>
      expect(onCreateNote).toHaveBeenCalledWith({
        title: "Release notes",
        body: "Confirmed details",
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Note saved.");
  });

  it("queues Brain Dump content through the shared queue while offline", async () => {
    onlineSpy.mockReturnValue(false);
    const onCaptureBrainDump = vi.fn();
    const { user } = renderWithUser(
      <QuickAddHarness initialType="brain-dump" dialogProps={{ onCaptureBrainDump }} />,
    );

    await user.type(screen.getByLabelText("Content"), "Follow up later");
    await user.click(screen.getByRole("button", { name: "Add brain dump item" }));

    expect(onCaptureBrainDump).toHaveBeenCalledWith({
      content: "Follow up later",
      mode: "queue",
    });
    expect(screen.getByRole("status")).toHaveTextContent("queued on this device");
  });

  it("loads real Habit options and writes the selected absolute count", async () => {
    const onLogHabit = vi.fn().mockResolvedValue(undefined);
    const { user } = renderWithUser(
      <QuickAddHarness
        initialType="habit"
        dialogProps={{
          habitOptions: [{ id: "habit-1", label: "Read", targetCount: 2 }],
          onLogHabit,
        }}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Habit"), "habit-1");
    expect(screen.getByLabelText("Completed count")).toHaveValue(2);
    await user.click(screen.getByRole("button", { name: "Log habit" }));

    expect(onLogHabit).toHaveBeenCalledWith({ habitId: "habit-1", count: 2 });
    expect(screen.getByRole("status")).toHaveTextContent("Habit Entry saved.");
  });

  it("disables unsafe offline types and options when offline, but queues safe ones", async () => {
    onlineSpy.mockReturnValue(false); // Simulate offline state
    const { user } = renderWithUser(<QuickAddHarness />);

    // Time Block button is disabled
    const timeBlockBtn = screen.getByRole("button", { name: "Time Block" });
    expect(timeBlockBtn).toBeDisabled();

    // Select options in More are disabled
    const select = screen.getByRole("combobox", { name: "More creation types" });
    const projectOption = within(select).getByRole("option", { name: "Project" });
    expect(projectOption).toBeDisabled();

    // Submit Task offline (Task is offline safe)
    await user.type(screen.getByLabelText("Title"), "Read daily article");
    const submitBtn = screen.getByRole("button", { name: "Add task" });
    await user.click(submitBtn);

    // Wait for dialog close
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Verify offline queued toast message
    expect(screen.getByRole("status")).toHaveTextContent(
      'Task "Read daily article" queued — will sync when online',
    );
  });

  it("handles the global keyboard shortcut correctly", async () => {
    const { user } = renderWithUser(<ShortcutHarness />);

    // Pressing 'q' globally opens the dialog
    await user.keyboard("q");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Close the dialog
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Focus an input field
    const testInput = screen.getByTestId("test-input");
    testInput.focus();

    // Pressing 'q' inside an input does NOT open the dialog
    await user.type(testInput, "q");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(testInput).toHaveValue("q");
  });

  it("has no axe violations on a normal desktop render", async () => {
    const { container, user } = renderWithUser(<QuickAddHarness />);
    await expectNoAccessibilityViolations(container);

    // Switch to Goal and verify a11y
    await user.click(screen.getByRole("combobox", { name: "More creation types" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "More creation types" }), "goal");
    await expectNoAccessibilityViolations(container);
  });
});
