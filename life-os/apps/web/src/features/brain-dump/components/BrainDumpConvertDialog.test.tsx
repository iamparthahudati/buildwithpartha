import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { BrainDumpConvertDialog } from "./BrainDumpConvertDialog";
import type { BrainDumpItem } from "../model/brainDumpItem";

const ITEM: BrainDumpItem = {
  id: "bd-1",
  userId: "user-1",
  content: "Draft the quarterly plan",
  status: "UNPROCESSED",
  archived: false,
  version: 4,
  convertedToType: null,
  convertedToId: null,
  convertedAt: null,
  archivedAt: null,
  createdAt: "2026-08-29T10:00:00Z",
  updatedAt: "2026-08-29T10:00:00Z",
};

function renderDialog(props: Partial<React.ComponentProps<typeof BrainDumpConvertDialog>> = {}) {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <BrainDumpConvertDialog open item={ITEM} onSubmit={onSubmit} onClose={onClose} {...props} />
    </MemoryRouter>,
  );
  return { onSubmit, onClose };
}

describe("BrainDumpConvertDialog", () => {
  it("shows the preserved source text and a default task submit", () => {
    renderDialog();
    expect(screen.getAllByText("Draft the quarterly plan").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Convert to Task" })).toBeInTheDocument();
  });

  it("submits the task payload built from the item version", async () => {
    const { onSubmit } = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Convert to Task" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "bd-1",
        target: "TASK",
        request: expect.objectContaining({ priority: "P3", version: 4 }),
      }),
    );
  });

  it("reveals the note body field when switching destination to Note", async () => {
    const { onSubmit } = renderDialog();
    await userEvent.selectOptions(screen.getByLabelText("Convert to"), "NOTE");
    expect(screen.getByLabelText("Note body")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Convert to Note" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        target: "NOTE",
        request: expect.objectContaining({ body: "Draft the quarterly plan", version: 4 }),
      }),
    );
  });

  it("blocks submission when the title is cleared", async () => {
    const { onSubmit } = renderDialog();
    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.click(screen.getByRole("button", { name: "Convert to Task" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces a server error", () => {
    renderDialog({ error: "Failed to convert to Task. Your item is unchanged — try again." });
    expect(screen.getByText(/Your item is unchanged/i)).toBeInTheDocument();
  });

  it("renders a transactional result link after conversion resolves", () => {
    renderDialog({ result: { type: "TASK", id: "task-9" } });
    const link = screen.getByRole("link", { name: /Open the new Task/i });
    expect(link).toHaveAttribute("href", "/life-os/app/tasks/task-9");
  });

  it("opens directly to the result link for an already-converted item (idempotent)", () => {
    render(
      <MemoryRouter>
        <BrainDumpConvertDialog
          open
          item={{
            ...ITEM,
            status: "CONVERTED",
            convertedToType: "GOAL",
            convertedToId: "goal-3",
          }}
          onSubmit={vi.fn()}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /Open the new Goal/i })).toHaveAttribute(
      "href",
      "/life-os/app/goals/goal-3",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <BrainDumpConvertDialog open item={ITEM} onSubmit={vi.fn()} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    await expectNoAccessibilityViolations(container);
  });

  it("does not render when there is no item", () => {
    const { container } = render(
      <MemoryRouter>
        <BrainDumpConvertDialog open item={null} onSubmit={vi.fn()} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(within(container).queryByRole("dialog")).not.toBeInTheDocument();
  });
});
