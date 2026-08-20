import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { SprintProgressCapacity } from "./SprintProgressCapacity";
import type { Sprint } from "../model/sprint";
import type { LocalDate } from "@lib/localDateTime";

const MOCK_SPRINT: Sprint = {
  id: "sprint-1",
  name: "Sprint 14 - Foundation",
  goal: "Complete core shell",
  startDate: "2026-08-15" as LocalDate,
  endDate: "2026-08-29" as LocalDate,
  status: "ACTIVE",
  targetCapacityPoints: 30,
  completedStoryPoints: 18,
  totalStoryPoints: 24,
};

describe("SprintProgressCapacity", () => {
  it("renders sprint progress and capacity metrics", async () => {
    const { container } = render(<SprintProgressCapacity sprint={MOCK_SPRINT} />);

    expect(screen.getByText("18 / 24 pts (75%)")).toBeInTheDocument();
    expect(screen.getByText("24 / 30 pts (80%)")).toBeInTheDocument();
    expect(screen.getByText("Within capacity")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("indicates over capacity state", () => {
    const overSprint: Sprint = {
      ...MOCK_SPRINT,
      totalStoryPoints: 35,
      targetCapacityPoints: 30,
    };
    render(<SprintProgressCapacity sprint={overSprint} />);

    expect(screen.getByText("Over capacity")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(<SprintProgressCapacity loading />);
    expect(container.querySelector(".is-loading")).toBeInTheDocument();
  });

  it("renders error state with retry", () => {
    const onRetry = vi.fn();
    render(<SprintProgressCapacity error="Failed to load" onRetry={onRetry} />);

    expect(screen.getByText("Unable to load sprint progress")).toBeInTheDocument();
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("renders empty state when no sprint provided", () => {
    render(<SprintProgressCapacity />);
    expect(screen.getByText("No sprint data")).toBeInTheDocument();
  });
});
