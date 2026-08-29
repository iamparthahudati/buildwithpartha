import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { DependencyEditor, type DependencyEditorTask } from "./DependencyEditor";
import { dependencyEditorErrorMessage } from "../model/dependencyEditorErrors";

const CURRENT_TASK: DependencyEditorTask = {
  id: "task-current",
  title: "Prepare weekly review",
  status: "BLOCKED",
  priority: "P1",
  href: "/life-os/app/tasks/task-current",
};

const BLOCKER: DependencyEditorTask = {
  id: "task-hosting",
  title: "Compare hosting options",
  status: "IN_PROGRESS",
  priority: "P2",
  href: "/life-os/app/tasks/task-hosting",
};

const RESOLVED_BLOCKER: DependencyEditorTask = {
  id: "task-records",
  title: "Organize tax documents",
  status: "DONE",
  priority: "P3",
  href: "/life-os/app/tasks/task-records",
};

const DEPENDENT: DependencyEditorTask = {
  id: "task-course",
  title: "Complete the accessibility course",
  status: "TO_DO",
  priority: "P2",
};

function deferredPromise() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("DependencyEditor", () => {
  it("renders blocker/dependent direction, resolution state, and completion navigation accessibly", async () => {
    const { container } = renderWithUser(
      <DependencyEditor
        task={CURRENT_TASK}
        blockers={[BLOCKER, RESOLVED_BLOCKER]}
        dependents={[DEPENDENT]}
        onOpenTask={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Dependencies" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Blocked by" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Blocks" })).toBeInTheDocument();
    expect(screen.getByText(/1 unresolved blocker/)).toBeInTheDocument();
    expect(screen.getByText("Unresolved blocker")).toBeInTheDocument();
    expect(screen.getByText("Resolved blocker")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: BLOCKER.title })).toHaveAttribute("href", BLOCKER.href);
    expect(screen.getByRole("button", { name: "Open task" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("searches, selects, and adds a blocker in a focus-safe dialog", async () => {
    const deferred = deferredPromise();
    const onAddBlocker = vi.fn(() => deferred.promise);
    const onSearchQueryChange = vi.fn();
    const { user, container } = renderWithUser(
      <DependencyEditor
        task={CURRENT_TASK}
        blockerOptions={[CURRENT_TASK, BLOCKER]}
        onAddBlocker={onAddBlocker}
        onSearchQueryChange={onSearchQueryChange}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Add blocker" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Add blocker" });
    expect(dialog).toHaveClass("lifeos-dependency-editor__dialog");

    const input = within(dialog).getByRole("combobox", { name: "Task blocker" });
    expect(input).toHaveFocus();
    await user.type(input, "hosting");
    expect(onSearchQueryChange).toHaveBeenLastCalledWith("hosting");
    await user.click(
      within(dialog).getByRole("option", {
        name: "Compare hosting options — In progress",
      }),
    );

    await user.click(within(dialog).getByRole("button", { name: "Add blocker" }));
    expect(onAddBlocker).toHaveBeenCalledWith(BLOCKER.id);
    expect(within(dialog).getByRole("button", { name: "Add blocker" })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    deferred.resolve();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(`Blocker added: ${BLOCKER.title}.`);

    await expectNoAccessibilityViolations(container);
  });

  it("prevents empty selection and explains self and cycle failures with approved copy", async () => {
    const { user, rerender } = renderWithUser(
      <DependencyEditor
        task={CURRENT_TASK}
        blockerOptions={[CURRENT_TASK, BLOCKER]}
        onAddBlocker={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add blocker" }));
    const dialog = screen.getByRole("dialog", { name: "Add blocker" });
    await user.click(within(dialog).getByRole("button", { name: "Add blocker" }));
    expect(screen.getByText("Choose a Task to add as a blocker.")).toBeInTheDocument();

    const input = within(dialog).getByRole("combobox", { name: "Task blocker" });
    await user.clear(input);
    await user.type(input, "Prepare");
    expect(
      within(dialog).getByRole("option", { name: "Prepare weekly review — current Task" }),
    ).toHaveAttribute("aria-disabled", "true");

    await user.clear(input);
    await user.type(input, "hosting");
    await user.click(
      within(dialog).getByRole("option", {
        name: "Compare hosting options — In progress",
      }),
    );
    rerender(
      <DependencyEditor
        task={CURRENT_TASK}
        blockerOptions={[CURRENT_TASK, BLOCKER]}
        onAddBlocker={vi.fn()}
        operationErrors={[
          {
            operation: "add",
            relationship: "BLOCKER",
            taskId: BLOCKER.id,
            reason: "cycle",
          },
        ]}
      />,
    );

    expect(
      screen.getByText(
        "This dependency would create a loop. Choose a Task outside this dependency chain.",
      ),
    ).toBeInTheDocument();
    expect(dependencyEditorErrorMessage("self")).toBe(
      "Choose a different Task. A Task can't block itself.",
    );
  });

  it("preserves a failed add selection, hides technical detail, and retries", async () => {
    let attempt = 0;
    const onAddBlocker = vi.fn(() => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error("database detail")) : Promise.resolve();
    });
    const { user } = renderWithUser(
      <DependencyEditor
        task={CURRENT_TASK}
        blockerOptions={[BLOCKER]}
        onAddBlocker={onAddBlocker}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add blocker" }));
    const dialog = screen.getByRole("dialog", { name: "Add blocker" });
    await user.click(
      within(dialog).getByRole("option", {
        name: "Compare hosting options — In progress",
      }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Add blocker" }));

    expect(
      await within(dialog).findByText(
        "We couldn't add this blocker. Your selection is still here. Try again.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText("database detail")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Compare hosting options — In progress")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Try again" }));
    expect(onAddBlocker).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("unlinks both relationship directions and isolates a retryable failure", async () => {
    let attempt = 0;
    const onRemoveDependency = vi.fn((_taskId: string, relationship: string) => {
      if (relationship === "BLOCKER") {
        attempt += 1;
        if (attempt === 1) return Promise.reject(new Error("technical detail"));
      }
      return Promise.resolve();
    });
    const { user } = renderWithUser(
      <DependencyEditor
        task={CURRENT_TASK}
        blockers={[BLOCKER]}
        dependents={[DEPENDENT]}
        onRemoveDependency={onRemoveDependency}
      />,
    );

    await user.click(screen.getByRole("button", { name: `Unlink ${BLOCKER.title} as a blocker` }));
    expect(
      await screen.findByText(
        "We couldn't unlink this Task dependency. The saved relationship is still shown. Try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("technical detail")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRemoveDependency).toHaveBeenLastCalledWith(BLOCKER.id, "BLOCKER");

    await user.click(
      screen.getByRole("button", { name: `Unlink ${DEPENDENT.title} as a dependent` }),
    );
    expect(onRemoveDependency).toHaveBeenLastCalledWith(DEPENDENT.id, "DEPENDENT");
  });

  it("keeps controlled pending and partial failures scoped to their Task row", async () => {
    const onRetry = vi.fn();
    const { container, user } = renderWithUser(
      <DependencyEditor
        task={CURRENT_TASK}
        blockers={[BLOCKER, RESOLVED_BLOCKER]}
        onRemoveDependency={vi.fn()}
        pendingRemovals={[{ taskId: BLOCKER.id, relationship: "BLOCKER" }]}
        operationErrors={[
          {
            operation: "remove",
            relationship: "BLOCKER",
            taskId: RESOLVED_BLOCKER.id,
            reason: "conflict",
            onRetry,
          },
        ]}
      />,
    );

    expect(screen.getByText("Unlinking Task dependency…")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Unlink ${BLOCKER.title} as a blocker` }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: `Unlink ${RESOLVED_BLOCKER.title} as a blocker` }),
    ).toBeEnabled();
    expect(screen.getByText(/dependency changed elsewhere/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();

    await expectNoAccessibilityViolations(container);
  });

  it("supports fallback completion navigation when no href is available", async () => {
    const onOpenTask = vi.fn();
    const blockerWithoutHref: DependencyEditorTask = {
      id: BLOCKER.id,
      title: BLOCKER.title,
      status: BLOCKER.status,
      priority: BLOCKER.priority,
    };
    const { user } = renderWithUser(
      <DependencyEditor
        task={CURRENT_TASK}
        blockers={[blockerWithoutHref]}
        dependents={[DEPENDENT]}
        onOpenTask={onOpenTask}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open blocker" }));
    expect(onOpenTask).toHaveBeenLastCalledWith(BLOCKER.id);
    await user.click(screen.getByRole("button", { name: "Open task" }));
    expect(onOpenTask).toHaveBeenLastCalledWith(DEPENDENT.id);
  });

  it("covers loading, empty, load error, permission, and disabled states", async () => {
    const onRetry = vi.fn();
    const { rerender, user, container } = renderWithUser(
      <DependencyEditor task={CURRENT_TASK} loading />,
    );
    expect(screen.getByText("Loading Task dependencies.")).toBeInTheDocument();

    rerender(<DependencyEditor task={CURRENT_TASK} />);
    expect(screen.getByRole("heading", { level: 4, name: "No blockers" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 4, name: "Doesn't block other Tasks" }),
    ).toBeInTheDocument();

    rerender(
      <DependencyEditor
        task={CURRENT_TASK}
        error="Task details are still available."
        onRetry={onRetry}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(
      <DependencyEditor
        task={CURRENT_TASK}
        blockers={[BLOCKER]}
        blockerOptions={[DEPENDENT]}
        readOnly
        readOnlyReason="You can view these dependencies, but you don't have permission to change them."
        onAddBlocker={vi.fn()}
        onRemoveDependency={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Add blocker" })).not.toBeInTheDocument();
    expect(screen.getByText(/don't have permission to change them/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Unlink ${BLOCKER.title} as a blocker` }),
    ).toBeDisabled();

    rerender(
      <DependencyEditor
        task={CURRENT_TASK}
        blockers={[BLOCKER]}
        blockerOptions={[DEPENDENT]}
        disabled
        disabledReason="Reconnect to change Task dependencies."
        onAddBlocker={vi.fn()}
        onRemoveDependency={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Add blocker" })).toBeDisabled();
    expect(screen.getByText("Reconnect to change Task dependencies.")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });
});
