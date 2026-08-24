import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectNoAccessibilityViolations } from "@test/accessibility";

import { TimeSummaryMetrics } from "./TimeSummaryMetrics";
import { TimeCategoryBreakdown, type TimeCategoryItem } from "./TimeCategoryBreakdown";
import { TimeGoalProgressCard } from "./TimeGoalProgressCard";
import { UpcomingBlocks } from "./UpcomingBlocks";
import { TimeSummary } from "./TimeSummary";
import type { TimeBlock } from "../model/timeBlock";

const MOCK_BLOCK_1: TimeBlock = {
  id: "tb-1",
  title: "Architecture Review",
  category: "Focus",
  date: "2026-08-24",
  startTime: "14:00",
  endTime: "15:30",
  status: "SCHEDULED",
};

const MOCK_BLOCK_2: TimeBlock = {
  id: "tb-2",
  title: "Quick Walk",
  category: "Break",
  date: "2026-08-24",
  startTime: "15:30",
  endTime: "16:00",
  status: "SCHEDULED",
};

describe("TimeSummary components", () => {
  describe("TimeSummaryMetrics", () => {
    it("renders ready metric counts for all 4 categories", () => {
      render(
        <TimeSummaryMetrics
          status={{
            type: "ready",
            counts: {
              focusMinutes: 225,
              breakMinutes: 45,
              personalMinutes: 135,
              unscheduledMinutes: 75,
            },
          }}
        />,
      );

      expect(screen.getByText("Focus time")).toBeInTheDocument();
      expect(screen.getByText("3 hr 45 min")).toBeInTheDocument();
      expect(screen.getByText("Break time")).toBeInTheDocument();
      expect(screen.getByText("45 min")).toBeInTheDocument();
      expect(screen.getByText("Personal time")).toBeInTheDocument();
      expect(screen.getByText("2 hr 15 min")).toBeInTheDocument();
      expect(screen.getByText("Unscheduled time")).toBeInTheDocument();
      expect(screen.getByText("1 hr 15 min")).toBeInTheDocument();
    });

    it("renders loading state", () => {
      render(<TimeSummaryMetrics status={{ type: "loading" }} />);
      expect(screen.getByRole("region", { name: "Time summary metrics" })).toBeInTheDocument();
    });

    it("renders error state with retry", () => {
      const handleRetry = vi.fn();
      render(
        <TimeSummaryMetrics
          status={{ type: "error", message: "Failed to fetch metrics", onRetry: handleRetry }}
        />,
      );
      expect(screen.getAllByText("Failed to fetch metrics")[0]).toBeInTheDocument();
    });

    it("passes accessibility check", async () => {
      const { container } = render(
        <TimeSummaryMetrics
          status={{
            type: "ready",
            counts: {
              focusMinutes: 120,
              breakMinutes: 30,
              personalMinutes: 60,
              unscheduledMinutes: 90,
            },
          }}
        />,
      );
      await expectNoAccessibilityViolations(container);
    });
  });

  describe("TimeCategoryBreakdown", () => {
    const categories: readonly TimeCategoryItem[] = [
      { name: "Focus", minutes: 240, colorName: "blue" },
      { name: "Break", minutes: 60, colorName: "teal" },
      { name: "Personal", minutes: 120, colorName: "purple" },
    ];

    it("renders breakdown chart frame with categories and total center text", () => {
      render(<TimeCategoryBreakdown status="ready" categories={categories} />);
      expect(screen.getByText("Time allocation by category")).toBeInTheDocument();
      expect(screen.getByText("7 hr")).toBeInTheDocument();
    });

    it("renders accessible data table fallback toggle", async () => {
      const user = userEvent.setup();
      render(<TimeCategoryBreakdown status="ready" categories={categories} />);
      const tableToggle = screen.getByRole("button", { name: /view as table/i });
      await user.click(tableToggle);
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("Focus")).toBeInTheDocument();
    });

    it("renders empty state", () => {
      render(<TimeCategoryBreakdown status="empty" categories={[]} />);
      expect(screen.getByText("No time tracked")).toBeInTheDocument();
    });

    it("passes accessibility check", async () => {
      const { container } = render(
        <TimeCategoryBreakdown status="ready" categories={categories} />,
      );
      await expectNoAccessibilityViolations(container);
    });
  });

  describe("TimeGoalProgressCard", () => {
    it("renders focus goal progress with percentage and status", () => {
      render(<TimeGoalProgressCard status="ready" targetMinutes={240} actualMinutes={225} />);
      expect(screen.getByText("Daily focus goal")).toBeInTheDocument();
      expect(screen.getByText("94%")).toBeInTheDocument();
      expect(screen.getByText("3 hr 45 min")).toBeInTheDocument();
      expect(screen.getByText("of 4 hr target")).toBeInTheDocument();
      expect(screen.getByText("15 min remaining to reach daily goal")).toBeInTheDocument();
    });

    it("renders goal reached state when actual meets target", () => {
      render(<TimeGoalProgressCard status="ready" targetMinutes={240} actualMinutes={300} />);
      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("Goal reached!")).toBeInTheDocument();
    });

    it("triggers onEditGoal callback when edit button is clicked", async () => {
      const user = userEvent.setup();
      const handleEditGoal = vi.fn();
      render(
        <TimeGoalProgressCard
          status="ready"
          targetMinutes={240}
          actualMinutes={120}
          onEditGoal={handleEditGoal}
        />,
      );
      const editBtn = screen.getByRole("button", { name: "Edit focus goal target" });
      await user.click(editBtn);
      expect(handleEditGoal).toHaveBeenCalledTimes(1);
    });

    it("passes accessibility check", async () => {
      const { container } = render(
        <TimeGoalProgressCard status="ready" targetMinutes={240} actualMinutes={200} />,
      );
      await expectNoAccessibilityViolations(container);
    });
  });

  describe("UpcomingBlocks", () => {
    it("renders list of upcoming time blocks", () => {
      render(<UpcomingBlocks status="ready" blocks={[MOCK_BLOCK_1, MOCK_BLOCK_2]} />);
      expect(screen.getByText("Upcoming time blocks")).toBeInTheDocument();
      expect(screen.getByText("Architecture Review")).toBeInTheDocument();
      expect(screen.getByText("Quick Walk")).toBeInTheDocument();
    });

    it("triggers callbacks for start focus, complete, and add block", async () => {
      const user = userEvent.setup();
      const handleStartFocus = vi.fn();
      const handleComplete = vi.fn();
      const handleCreateBlock = vi.fn();

      render(
        <UpcomingBlocks
          status="ready"
          blocks={[MOCK_BLOCK_1]}
          onStartFocus={handleStartFocus}
          onComplete={handleComplete}
          onCreateBlock={handleCreateBlock}
        />,
      );

      const addBtn = screen.getByRole("button", { name: /add block/i });
      await user.click(addBtn);
      expect(handleCreateBlock).toHaveBeenCalledTimes(1);

      const startBtn = screen.getByRole("button", { name: /start focus/i });
      await user.click(startBtn);
      expect(handleStartFocus).toHaveBeenCalledWith(MOCK_BLOCK_1);

      const completeBtn = screen.getByRole("button", { name: "Complete" });
      await user.click(completeBtn);
      expect(handleComplete).toHaveBeenCalledWith(MOCK_BLOCK_1);
    });

    it("renders empty state", () => {
      render(<UpcomingBlocks status="empty" blocks={[]} />);
      expect(screen.getByText("No upcoming blocks")).toBeInTheDocument();
    });

    it("passes accessibility check", async () => {
      const { container } = render(
        <UpcomingBlocks status="ready" blocks={[MOCK_BLOCK_1, MOCK_BLOCK_2]} />,
      );
      await expectNoAccessibilityViolations(container);
    });
  });

  describe("TimeSummary (master composite)", () => {
    it("renders full time summary dashboard section", () => {
      render(
        <TimeSummary
          metricsStatus={{
            type: "ready",
            counts: {
              focusMinutes: 240,
              breakMinutes: 60,
              personalMinutes: 120,
              unscheduledMinutes: 60,
            },
          }}
          breakdownStatus="ready"
          categories={[
            { name: "Focus", minutes: 240 },
            { name: "Break", minutes: 60 },
          ]}
          goalStatus="ready"
          targetMinutes={300}
          actualMinutes={240}
          upcomingStatus="ready"
          upcomingBlocks={[MOCK_BLOCK_1]}
        />,
      );

      expect(screen.getByRole("region", { name: "Time summary overview" })).toBeInTheDocument();
      expect(screen.getByText("Focus time")).toBeInTheDocument();
      expect(screen.getByText("Time allocation by category")).toBeInTheDocument();
      expect(screen.getByText("Daily focus goal")).toBeInTheDocument();
      expect(screen.getByText("Upcoming time blocks")).toBeInTheDocument();
    });

    it("passes accessibility check for master composite", async () => {
      const { container } = render(
        <TimeSummary
          metricsStatus={{
            type: "ready",
            counts: {
              focusMinutes: 240,
              breakMinutes: 60,
              personalMinutes: 120,
              unscheduledMinutes: 60,
            },
          }}
          breakdownStatus="ready"
          categories={[
            { name: "Focus", minutes: 240 },
            { name: "Break", minutes: 60 },
          ]}
          goalStatus="ready"
          targetMinutes={300}
          actualMinutes={240}
          upcomingStatus="ready"
          upcomingBlocks={[MOCK_BLOCK_1]}
        />,
      );
      await expectNoAccessibilityViolations(container);
    });
  });
});
