import { useState } from "react";
import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import {
  SubtaskChecklist,
  type SubtaskChecklistItem,
  type SubtaskChecklistProps,
} from "./SubtaskChecklist";

const SUBTASKS: readonly SubtaskChecklistItem[] = [
  { id: "subtask-plan", title: "Outline the implementation", completed: true, position: 0 },
  { id: "subtask-build", title: "Build the component", completed: false, position: 1 },
  { id: "subtask-check", title: "Verify keyboard access", completed: false, position: 2 },
];

const ACTIONS: Pick<
  SubtaskChecklistProps,
  "onAdd" | "onEdit" | "onToggle" | "onReorder" | "onDelete"
> = {
  onAdd: vi.fn(),
  onEdit: vi.fn(),
  onToggle: vi.fn(),
  onReorder: vi.fn(),
  onDelete: vi.fn(),
};

function deferredPromise() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("SubtaskChecklist", () => {
  it("sorts Subtasks, reports exact progress, and passes an accessibility audit", async () => {
    const { container } = renderWithUser(
      <SubtaskChecklist subtasks={[SUBTASKS[2]!, SUBTASKS[0]!, SUBTASKS[1]!]} {...ACTIONS} />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Subtasks" })).toBeInTheDocument();
    expect(screen.getByText("1 of 3 done")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Subtask progress" })).toHaveAttribute(
      "aria-valuetext",
      "1 of 3 Subtasks done",
    );
    expect(
      screen.getAllByRole("checkbox").map((checkbox) => checkbox.getAttribute("aria-label")),
    ).toEqual([null, null, null]);
    expect(screen.getAllByRole("checkbox").map((checkbox) => checkbox.id)).toHaveLength(3);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Outline the implementation");
    expect(screen.getAllByRole("listitem")[2]).toHaveTextContent("Verify keyboard access");

    await expectNoAccessibilityViolations(container);
  });

  it("validates, preserves, and adds a Subtask while exposing the pending state", async () => {
    const deferred = deferredPromise();
    const onAdd = vi.fn(() => deferred.promise);
    const { user } = renderWithUser(<SubtaskChecklist subtasks={[]} onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "Add subtask" }));
    expect(screen.getByText("Enter a Subtask title.")).toBeInTheDocument();

    const input = screen.getByRole("textbox", { name: "Subtask title" });
    await user.type(input, "Review component copy");
    await user.click(screen.getByRole("button", { name: "Add subtask" }));

    expect(onAdd).toHaveBeenCalledWith("Review component copy");
    expect(input).toHaveValue("Review component copy");
    expect(screen.getByRole("button", { name: "Add subtask" })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    deferred.resolve();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Subtask added: Review component copy.",
    );
    expect(input).toHaveValue("");
  });

  it("edits a Subtask, preserves a failed draft, and retries the same change", async () => {
    let attempt = 0;
    const onEdit = vi.fn(() => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error("technical detail")) : Promise.resolve();
    });
    const { user } = renderWithUser(<SubtaskChecklist subtasks={SUBTASKS} onEdit={onEdit} />);

    await user.click(screen.getByRole("button", { name: "Edit Build the component" }));
    const input = screen.getByRole("textbox", { name: "Edit Build the component" });
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, "Build the accessible checklist");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "We couldn't save this Subtask. Your changes are still here. Try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("technical detail")).not.toBeInTheDocument();
    expect(input).toHaveValue("Build the accessible checklist");

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onEdit).toHaveBeenCalledTimes(2);
  });

  it("toggles only the Subtask and explicitly keeps the parent Task open at 100%", async () => {
    const onToggle = vi.fn();

    function ControlledChecklist() {
      const [items, setItems] = useState<readonly SubtaskChecklistItem[]>([
        { id: "subtask-one", title: "Run focused tests", completed: true, position: 0 },
        { id: "subtask-two", title: "Check responsive layout", completed: false, position: 1 },
      ]);
      return (
        <SubtaskChecklist
          subtasks={items}
          onToggle={(subtaskId, completed) => {
            onToggle(subtaskId, completed);
            setItems((current) =>
              current.map((item) => (item.id === subtaskId ? { ...item, completed } : item)),
            );
          }}
        />
      );
    }

    const { user } = renderWithUser(<ControlledChecklist />);
    await user.click(screen.getByRole("checkbox", { name: "Check responsive layout" }));

    expect(onToggle).toHaveBeenCalledWith("subtask-two", true);
    expect(screen.getByText("2 of 2 done")).toBeInTheDocument();
    expect(
      screen.getByText(
        "All Subtasks are done. The Task stays open until you mark it done separately.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark task done/i })).not.toBeInTheDocument();
  });

  it("reorders through both drag handle drag events and Alt+Arrow keyboard controls", async () => {
    const onReorder = vi.fn();
    const { user } = renderWithUser(
      <SubtaskChecklist subtasks={SUBTASKS} onReorder={onReorder} onToggle={vi.fn()} />,
    );

    const dragHandle = screen.getByRole("button", { name: "Drag to reorder Build the component" });
    expect(dragHandle).toBeInTheDocument();
    expect(dragHandle).toHaveAttribute("aria-keyshortcuts", "Alt+ArrowUp Alt+ArrowDown");

    const itemBuild = screen.getByText("Build the component").closest("li")!;
    const itemPlan = screen.getByText("Outline the implementation").closest("li")!;

    await user.pointer([
      { target: itemBuild, keys: "[MouseLeft>]" },
      { target: itemPlan },
      { keys: "[/MouseLeft]" },
    ]);

    const checkbox = screen.getByRole("checkbox", { name: "Verify keyboard access" });
    checkbox.focus();
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
    expect(onReorder).toHaveBeenLastCalledWith(["subtask-plan", "subtask-check", "subtask-build"]);
    expect(checkbox).toHaveAttribute("aria-keyshortcuts", "Alt+ArrowUp Alt+ArrowDown");
  });

  it("confirms permanent deletion, keeps the dialog open on failure, and supports retry", async () => {
    let attempt = 0;
    const onDelete = vi.fn(() => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error("database failure")) : Promise.resolve();
    });
    const { user } = renderWithUser(<SubtaskChecklist subtasks={SUBTASKS} onDelete={onDelete} />);

    const deleteTrigger = screen.getByRole("button", { name: "Delete Build the component" });
    await user.click(deleteTrigger);
    const dialog = screen.getByRole("dialog", { name: "Delete “Build the component”?" });
    expect(dialog).toHaveTextContent("This can't be undone");
    expect(dialog).toHaveTextContent("checklist progress will be recalculated");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.click(within(dialog).getByRole("button", { name: "Delete subtask" }));
    expect(
      await within(dialog).findByText(
        "We couldn't delete this Subtask. It is still in the checklist. Try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("database failure")).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Delete subtask" }));
    expect(onDelete).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteTrigger).toHaveFocus();
  });

  it("isolates caller-owned pending and partial-error states to the affected Subtasks", async () => {
    const onRetry = vi.fn();
    const { container, user } = renderWithUser(
      <SubtaskChecklist
        subtasks={SUBTASKS}
        onToggle={vi.fn()}
        pendingOperations={[{ operation: "toggle", subtaskId: "subtask-plan" }]}
        operationErrors={[
          {
            operation: "toggle",
            subtaskId: "subtask-build",
            message: "This Subtask couldn't be updated. The other Subtasks are still available.",
            onRetry,
          },
        ]}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Outline the implementation" })).toBeDisabled();
    expect(screen.getByText("Saving Subtask state…")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Build the component" })).toBeEnabled();
    expect(screen.getByText("Verify keyboard access")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();

    await expectNoAccessibilityViolations(container);
  });

  it("covers loading, empty, region error, and read-only permission states", async () => {
    const onRetry = vi.fn();
    const { rerender, container, user } = renderWithUser(<SubtaskChecklist loading />);
    expect(screen.getByText("Loading Subtasks.")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    rerender(<SubtaskChecklist subtasks={[]} />);
    expect(screen.getByRole("heading", { level: 3, name: "No Subtasks yet" })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    rerender(<SubtaskChecklist error="Task details are still available." onRetry={onRetry} />);
    expect(screen.getByText("Subtasks couldn't load")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(
      <SubtaskChecklist
        subtasks={SUBTASKS}
        readOnly
        readOnlyReason="You can view these Subtasks, but you don't have permission to change them."
        {...ACTIONS}
      />,
    );
    expect(screen.getByText(/don't have permission to change them/)).toBeInTheDocument();
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeDisabled();
    }
    expect(screen.queryByRole("button", { name: "Add subtask" })).not.toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });
});
