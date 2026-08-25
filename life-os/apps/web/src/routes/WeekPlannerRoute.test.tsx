import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "@state/ToastProvider";
import { WeekPlannerRoute } from "./WeekPlannerRoute";

function renderRoute(initialEntry = "/life-os/app/week-planner") {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <WeekPlannerRoute />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe("WeekPlannerRoute", () => {
  it("renders WeekPlannerRoute inside router context", () => {
    renderRoute();

    expect(screen.getByRole("heading", { level: 1, name: "Week Planner" })).toBeInTheDocument();
    expect(screen.getByText("DRAFT PLAN")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize plan" })).toBeInTheDocument();
  });

  it("handles week navigation, outcome creation, day capacity update, and task allocation/unallocation", async () => {
    renderRoute();

    // Week navigation
    await userEvent.click(screen.getByRole("button", { name: "Previous week" }));
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    await userEvent.click(screen.getByRole("button", { name: "This week" }));

    // Create outcome
    const addInput = screen.getByRole("textbox", { name: "Outcome" });
    await userEvent.type(addInput, "New Route Outcome");
    const addBtn = screen.getByRole("button", { name: "Add outcome" });
    await userEvent.click(addBtn);
    expect(screen.getByText("New Route Outcome")).toBeInTheDocument();

    // Toggle outcome
    const checkboxes = screen.getAllByRole("checkbox");
    if (checkboxes[0]) {
      await userEvent.click(checkboxes[0]);
    }

    // Move outcome down
    const moveDownButtons = screen.getAllByRole("button", { name: /Move .* down/i });
    if (moveDownButtons[0]) {
      await userEvent.click(moveDownButtons[0]);
    }

    // Day capacity update
    const menuButtons = screen.getAllByRole("button", { name: /Day actions for/i });
    if (menuButtons[0]) {
      await userEvent.click(menuButtons[0]);
      await userEvent.click(screen.getByRole("menuitem", { name: /Adjust capacity for/i }));
      await userEvent.click(screen.getByRole("button", { name: "Save capacity" }));
    }

    // Unallocate task
    const unallocateBtns = screen.getAllByRole("button", { name: "Unallocate" });
    if (unallocateBtns[0]) {
      await userEvent.click(unallocateBtns[0]);
    }

    // Allocate task from queue
    const allocateBtns = screen.getAllByRole("button", { name: "Allocate task" });
    if (allocateBtns[0]) {
      await userEvent.click(allocateBtns[0]);
      const daySelect = screen.getByRole("combobox", { name: "Day" });
      await userEvent.selectOptions(daySelect, "2026-08-20");
      const submitBtns = screen.getAllByRole("button", { name: "Allocate task" });
      await userEvent.click(submitBtns[submitBtns.length - 1]!);
    }

    // Carry over task
    const carryBtns = screen.getAllByRole("button", { name: "Carry task" });
    if (carryBtns[0]) {
      await userEvent.click(carryBtns[0]);
    }
  });

  it("handles finalize and reopen interactive actions with toast notices", async () => {
    renderRoute();

    // Click finalize plan
    await userEvent.click(screen.getByRole("button", { name: "Finalize plan" }));
    expect(screen.getByRole("heading", { name: "Finalize week plan?" })).toBeInTheDocument();

    const confirmFinalizeButtons = screen.getAllByRole("button", { name: "Finalize plan" });
    await userEvent.click(confirmFinalizeButtons[confirmFinalizeButtons.length - 1]!);

    // Should switch to FINALIZED status
    expect(screen.getByText("FINALIZED")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen plan" })).toBeInTheDocument();

    // Click reopen plan
    await userEvent.click(screen.getByRole("button", { name: "Reopen plan" }));
    expect(screen.getByRole("heading", { name: "Reopen week plan?" })).toBeInTheDocument();

    const confirmReopenButtons = screen.getAllByRole("button", { name: "Reopen plan" });
    await userEvent.click(confirmReopenButtons[confirmReopenButtons.length - 1]!);

    // Should return to DRAFT PLAN status
    expect(screen.getByText("DRAFT PLAN")).toBeInTheDocument();
  });
});
