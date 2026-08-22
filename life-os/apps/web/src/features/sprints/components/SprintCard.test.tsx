import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { SprintCard } from "./SprintCard";
import type { Sprint } from "../model/sprint";
import type { LocalDate } from "@lib/localDateTime";

const MOCK_SPRINT: Sprint = {
  id: "sprint-1",
  name: "Sprint 14 - Foundation",
  goal: "Complete identity and shell foundation features",
  startDate: "2026-08-15" as LocalDate,
  endDate: "2026-08-29" as LocalDate,
  status: "ACTIVE",
  targetCapacityPoints: 30,
  completedStoryPoints: 18,
  totalStoryPoints: 24,
};

describe("SprintCard", () => {
  it("renders sprint card with title, status, goal, and actions", async () => {
    const onComplete = vi.fn();
    const onEditScope = vi.fn();
    const onEditSprint = vi.fn();
    const { container } = render(
      <SprintCard
        sprint={MOCK_SPRINT}
        onCompleteSprint={onComplete}
        onEditScope={onEditScope}
        onEditSprint={onEditSprint}
      />,
    );

    expect(screen.getByText("Sprint 14 - Foundation")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Complete identity and shell foundation features")).toBeInTheDocument();

    const completeBtn = screen.getByRole("button", { name: "Complete & Retrospective" });
    await userEvent.click(completeBtn);
    expect(onComplete).toHaveBeenCalledWith(MOCK_SPRINT);

    const editScopeBtn = screen.getByRole("button", { name: "Edit Scope" });
    await userEvent.click(editScopeBtn);
    expect(onEditScope).toHaveBeenCalledWith(MOCK_SPRINT);

    const editDetailsBtn = screen.getByRole("button", { name: "Edit Details" });
    await userEvent.click(editDetailsBtn);
    expect(onEditSprint).toHaveBeenCalledWith(MOCK_SPRINT);

    await expectNoAccessibilityViolations(container);
  });

  it("renders planned sprint with start action", async () => {
    const plannedSprint: Sprint = { ...MOCK_SPRINT, status: "PLANNED" };
    const onStart = vi.fn();

    render(<SprintCard sprint={plannedSprint} onStartSprint={onStart} />);
    expect(screen.getByText("Planned")).toBeInTheDocument();

    const startBtn = screen.getByRole("button", { name: "Start Sprint" });
    await userEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledWith(plannedSprint);
  });

  it("renders completed sprint with retrospective view action", async () => {
    const completedSprint: Sprint = { ...MOCK_SPRINT, status: "COMPLETED" };
    const onViewRetro = vi.fn();

    render(<SprintCard sprint={completedSprint} onViewRetrospective={onViewRetro} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();

    const retroBtn = screen.getByRole("button", { name: "View Retrospective" });
    await userEvent.click(retroBtn);
    expect(onViewRetro).toHaveBeenCalledWith(completedSprint);
  });
});
