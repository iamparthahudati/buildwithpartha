import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SprintTaskDialog, type SprintTaskOption } from "./SprintTaskDialog";

const OPTIONS: readonly SprintTaskOption[] = [
  { id: "t1", label: "Wire MIT provider — Life-OS", projectId: "p1", projectName: "Life-OS" },
  { id: "t2", label: "Beta auth — Niveshlabs", projectId: "p2", projectName: "Niveshlabs" },
  { id: "t3", label: "Landing hero — Niveshlabs", projectId: "p2", projectName: "Niveshlabs" },
];

function taskLabelsOf(select: HTMLSelectElement): string[] {
  return Array.from(select.querySelectorAll("option"))
    .map((option) => option.textContent ?? "")
    .filter((label) => label && label !== "Choose a Task");
}

describe("SprintTaskDialog project filter", () => {
  it("narrows the task options to the chosen project", async () => {
    const user = userEvent.setup();
    render(<SprintTaskDialog open onClose={vi.fn()} onSubmit={vi.fn()} taskOptions={OPTIONS} />);

    const [projectSelect, taskSelect] = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(taskLabelsOf(taskSelect!)).toHaveLength(3);

    await user.selectOptions(projectSelect!, "p2");

    expect(taskLabelsOf(taskSelect!)).toEqual([
      "Beta auth — Niveshlabs",
      "Landing hero — Niveshlabs",
    ]);
  });

  it("auto-fills story points from the task estimate on selection (1pt = 1hr)", async () => {
    const user = userEvent.setup();
    render(
      <SprintTaskDialog
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        taskOptions={[
          { id: "big", label: "Big task", estimateMinutes: 180 },
          { id: "small", label: "Small task", estimateMinutes: 20 },
        ]}
      />,
    );

    const points = screen.getByRole("spinbutton");
    expect(points).toHaveValue(1);

    await user.selectOptions(screen.getByRole("combobox"), "big");
    expect(points).toHaveValue(3);

    await user.selectOptions(screen.getByRole("combobox"), "small");
    expect(points).toHaveValue(1);
  });

  it("hides the project filter when only one project is present", () => {
    render(
      <SprintTaskDialog open onClose={vi.fn()} onSubmit={vi.fn()} taskOptions={[OPTIONS[0]!]} />,
    );
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });
});
