import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import type { WeekCapacitySummaryData } from "../model/weekPlanner";
import { WeekCapacitySummary } from "./WeekCapacitySummary";

const SUMMARY_BALANCED: WeekCapacitySummaryData = {
  totalPlannedMinutes: 2040,
  totalAvailableMinutes: 2400,
  totalTasksCount: 20,
  completedTasksCount: 7,
  daysCount: 7,
  hasConflicts: false,
  categoryBreakdown: [
    { category: "Deep Work", minutes: 1200 },
    { category: "Meetings", minutes: 480 },
    { category: "Admin", minutes: 360 },
  ],
};

const SUMMARY_OVERCAPACITY: WeekCapacitySummaryData = {
  totalPlannedMinutes: 2880,
  totalAvailableMinutes: 2400,
  overcapacityMinutes: 480,
  totalTasksCount: 25,
  completedTasksCount: 10,
  daysCount: 7,
  hasConflicts: true,
  categoryBreakdown: [
    { category: "Deep Work", minutes: 1800 },
    { category: "Meetings", minutes: 600 },
    { category: "Admin", minutes: 480 },
  ],
};

describe("WeekCapacitySummary", () => {
  it("renders balanced capacity metrics and category breakdown", () => {
    renderWithUser(<WeekCapacitySummary summary={SUMMARY_BALANCED} locale="en-US" />);

    expect(screen.getByRole("heading", { name: "Weekly Capacity" })).toBeInTheDocument();
    expect(screen.getByText("Balanced plan")).toBeInTheDocument();
    expect(screen.getByText("34h")).toBeInTheDocument();
    expect(screen.getByText("40h available")).toBeInTheDocument();
    expect(screen.getByText(/20 tasks completed \(35%\)/i)).toBeInTheDocument();
  });

  it("renders overcapacity warning notice when planned exceeds available", () => {
    renderWithUser(<WeekCapacitySummary summary={SUMMARY_OVERCAPACITY} locale="en-US" />);

    expect(screen.getByText("Over capacity (+8h)")).toBeInTheDocument();
    expect(
      screen.getByText(/Notice: Planned time exceeds available capacity by 8h\./i),
    ).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = renderWithUser(<WeekCapacitySummary loading locale="en-US" />);
    expect(container.querySelector(".lifeos-week-capacity-summary--loading")).toBeInTheDocument();
  });

  it("renders error state with retry", async () => {
    const handleRetry = vi.fn();
    const { user } = renderWithUser(
      <WeekCapacitySummary error="Failed to load capacity summary" onRetry={handleRetry} />,
    );

    expect(screen.getByText("Failed to load capacity summary")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: "Try again" });
    await user.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledOnce();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <WeekCapacitySummary summary={SUMMARY_BALANCED} locale="en-US" />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
