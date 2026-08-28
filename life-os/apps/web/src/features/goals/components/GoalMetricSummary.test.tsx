import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { GoalMetricSummary } from "./GoalMetricSummary";
import type { GoalSummaryCounts } from "../model/goal";

const MOCK_COUNTS: GoalSummaryCounts = {
  totalGoals: 10,
  activeGoals: 6,
  completedGoals: 3,
  pausedGoals: 1,
  archivedGoals: 2,
  averageProgressPercentage: 65,
};

describe("GoalMetricSummary", () => {
  it("renders metric cards with calculated goal counts and progress", async () => {
    const { container } = render(<GoalMetricSummary counts={MOCK_COUNTS} />);

    expect(screen.getByText("Total Goals")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Completed Goals")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Average Progress")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });
});
