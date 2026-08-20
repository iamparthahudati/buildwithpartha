import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { TodaySprintState } from "../model/todaySprintWeek";
import { TodaySprintSummary } from "./TodaySprintSummary";

const READY: TodaySprintState = {
  type: "ready",
  sprint: {
    sprintId: "sprint-17",
    name: "Accessibility course",
    startDate: "2026-08-17",
    endDate: "2026-08-28",
    completedStoryPoints: 5,
    totalStoryPoints: 8,
  },
};

describe("TodaySprintSummary", () => {
  it("renders a named, keyboard-readable progress chart and canonical link", () => {
    renderWithUser(<TodaySprintSummary state={READY} locale="en-US" />);

    expect(screen.getByText("Accessibility course")).toBeInTheDocument();
    expect(screen.getByText("Aug 17, 2026 – Aug 28, 2026")).toBeInTheDocument();
    expect(screen.getByText("5 of 8 sprint points completed.")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Accessibility course sprint progress" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Completed: 5 points, 63%" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("link", { name: "Open sprint" })).toHaveAttribute(
      "href",
      "/life-os/app/sprints/sprint-17",
    );
  });

  it("uses an honest no-denominator message instead of a zero-percent chart", () => {
    renderWithUser(
      <TodaySprintSummary
        state={{
          type: "ready",
          sprint: { ...READY.sprint, completedStoryPoints: 0, totalStoryPoints: 0 },
        }}
        locale="en-US"
      />,
    );

    expect(screen.getByText("No sprint points are committed yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /sprint progress/i })).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("renders loading, empty, and recoverable error states", async () => {
    const onRetry = vi.fn();
    const { user, rerender } = renderWithUser(
      <TodaySprintSummary state={{ type: "loading" }} locale="en-US" />,
    );
    expect(screen.getByRole("status", { name: "Loading current sprint" })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    rerender(<TodaySprintSummary state={{ type: "empty" }} locale="en-US" />);
    expect(screen.getByText("No active sprint")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Sprints" })).toBeInTheDocument();

    rerender(
      <TodaySprintSummary
        state={{ type: "error", message: "Other Today sections are still available." }}
        locale="en-US"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("Current sprint couldn't load.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("has no accessibility violations in ready and error states", async () => {
    const { container, rerender } = renderWithUser(
      <TodaySprintSummary state={READY} locale="en-US" />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(
      <TodaySprintSummary
        state={{ type: "error", message: "Other Today sections are still available." }}
        locale="en-US"
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
