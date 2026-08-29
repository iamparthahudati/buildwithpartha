import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { SprintRetrospectiveDialog } from "./SprintRetrospectiveDialog";
import type { Sprint } from "../model/sprint";
import type { LocalDate } from "@lib/localDateTime";

const MOCK_SPRINT: Sprint = {
  id: "sprint-1",
  name: "Sprint 14",
  goal: "Complete identity and shell",
  startDate: "2026-08-15" as LocalDate,
  endDate: "2026-08-29" as LocalDate,
  status: "ACTIVE",
  targetCapacityPoints: 30,
  completedStoryPoints: 18,
  totalStoryPoints: 24,
};

describe("SprintRetrospectiveDialog", () => {
  it("renders retrospective dialog and submits retrospective data", async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <SprintRetrospectiveDialog
        open={true}
        onClose={onClose}
        onSubmit={onSubmit}
        sprint={MOCK_SPRINT}
      />,
    );

    expect(screen.getByText("Complete Sprint — Sprint 14")).toBeInTheDocument();
    expect(screen.getByText("18 of 24 story points completed (75%)")).toBeInTheDocument();

    const wellInput = screen.getByLabelText(/What went well\?/);
    await userEvent.type(wellInput, "Good team velocity.");

    const submitBtn = screen.getByRole("button", { name: "Complete Sprint" });
    await userEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      sprintId: "sprint-1",
      whatWentWell: "Good team velocity.",
      carryOverDestination: "BACKLOG",
    });

    await expectNoAccessibilityViolations(container);
  });

  it("requires and submits a versionable planned Sprint carry-over target", async () => {
    const onSubmit = vi.fn();
    render(
      <SprintRetrospectiveDialog
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        sprint={MOCK_SPRINT}
        carryOverTargets={[
          { id: "sprint-next", name: "Next Sprint" },
          { id: "sprint-later", name: "Later Sprint" },
        ]}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Carry Over to Sprint"), "sprint-later");
    await userEvent.click(screen.getByRole("button", { name: "Complete Sprint" }));

    expect(onSubmit).toHaveBeenCalledWith({
      sprintId: "sprint-1",
      carryOverDestination: "NEXT_SPRINT",
      targetSprintId: "sprint-later",
    });
  });

  it("renders a completed retrospective as immutable history", async () => {
    const onClose = vi.fn();
    render(
      <SprintRetrospectiveDialog
        open
        onClose={onClose}
        onSubmit={vi.fn()}
        sprint={{
          ...MOCK_SPRINT,
          status: "COMPLETED",
          whatWentWell: "We protected the planned scope.",
          actionItems: ["Keep capacity visible."],
        }}
      />,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("We protected the planned scope.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close retrospective" }));
    expect(onClose).toHaveBeenCalled();
  });
});
