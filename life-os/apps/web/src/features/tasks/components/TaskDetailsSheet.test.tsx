import { useState } from "react";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { TaskDetailsHeaderTask } from "./TaskDetailsHeader";
import { TaskDetailsSheet } from "./TaskDetailsSheet";

const TASK: TaskDetailsHeaderTask = {
  id: "task-weekly-review",
  title: "Prepare weekly review",
  status: "TO_DO",
  priority: "P2",
  progress: 0,
};

function SheetFromList() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open Prepare weekly review
      </button>
      <TaskDetailsSheet open={open} onClose={() => setOpen(false)} task={TASK} />
    </>
  );
}

describe("TaskDetailsSheet", () => {
  it("uses the responsive Drawer contract and restores originating-list focus", async () => {
    const { container, user } = renderWithUser(<SheetFromList />);
    const trigger = screen.getByRole("button", { name: "Open Prepare weekly review" });

    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: TASK.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close task details" })).toHaveFocus();
    expect(screen.getByRole("tablist", { name: "Task details tabs" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);

    await user.click(screen.getByRole("button", { name: "Close task details" }));
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
