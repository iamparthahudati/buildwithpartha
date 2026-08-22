import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TodayMetricStrip, type TodayMetricsData } from "./TodayMetricStrip";

function loadingData(): TodayMetricsData {
  return {
    mitStatus: { type: "loading" },
    tasksStatus: { type: "loading" },
    scheduledTimeStatus: { type: "loading" },
    focusTimeStatus: { type: "loading" },
    activeProjectsStatus: { type: "loading" },
    weekProgressStatus: { type: "loading" },
  };
}

describe("TodayMetricStrip", () => {
  it("renders all six metric card labels", () => {
    renderWithUser(<TodayMetricStrip {...loadingData()} />);

    expect(screen.getByText("Today's focus")).toBeInTheDocument();
    expect(screen.getByText("Tasks today")).toBeInTheDocument();
    expect(screen.getByText("Scheduled time")).toBeInTheDocument();
    expect(screen.getByText("Focus time")).toBeInTheDocument();
    expect(screen.getByText("Active projects")).toBeInTheDocument();
    expect(screen.getByText("Week progress")).toBeInTheDocument();
  });

  it("renders all six cards in loading state with visible label skeletons", () => {
    const { container } = renderWithUser(<TodayMetricStrip {...loadingData()} />);

    // Six skeletons — one per card
    const skeletons = container.querySelectorAll(".lifeos-skeleton");
    expect(skeletons.length).toBe(6);
  });

  it("shows the ready value for each card when data is ready", () => {
    renderWithUser(
      <TodayMetricStrip
        mitStatus={{ type: "ready", value: "Write spec" }}
        tasksStatus={{ type: "ready", value: "4 / 6" }}
        scheduledTimeStatus={{ type: "ready", value: "2h 30m" }}
        focusTimeStatus={{ type: "ready", value: "45m / 2h" }}
        activeProjectsStatus={{ type: "ready", value: "3" }}
        weekProgressStatus={{ type: "ready", value: "60%" }}
      />,
    );

    expect(screen.getByText("Write spec")).toBeInTheDocument();
    expect(screen.getByText("4 / 6")).toBeInTheDocument();
    expect(screen.getByText("2h 30m")).toBeInTheDocument();
    expect(screen.getByText("45m / 2h")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("shows the empty message from each card independently", () => {
    renderWithUser(
      <TodayMetricStrip
        {...loadingData()}
        mitStatus={{ type: "empty", message: "Choose today's focus" }}
        tasksStatus={{ type: "empty", message: "No tasks planned" }}
      />,
    );

    expect(screen.getByText("Choose today's focus")).toBeInTheDocument();
    expect(screen.getByText("No tasks planned")).toBeInTheDocument();
  });

  it("shows an error message and retry button for a single card without affecting others", async () => {
    const onRetryMit = vi.fn();
    const { user } = renderWithUser(
      <TodayMetricStrip
        {...loadingData()}
        mitStatus={{ type: "error", message: "Could not load focus." }}
        onRetryMit={onRetryMit}
      />,
    );

    expect(screen.getByText("Could not load focus.")).toBeInTheDocument();
    // The retry button should be present for the MIT card
    const retryButton = screen.getByRole("button", { name: "Try again" });
    await user.click(retryButton);
    expect(onRetryMit).toHaveBeenCalledTimes(1);

    // Other cards remain in loading state (have skeletons)
    const { container } = renderWithUser(
      <TodayMetricStrip
        {...loadingData()}
        mitStatus={{ type: "error", message: "Could not load focus." }}
        onRetryMit={onRetryMit}
      />,
    );
    const skeletons = container.querySelectorAll(".lifeos-skeleton");
    // 5 of 6 still loading
    expect(skeletons.length).toBe(5);
  });

  it("shows an error message without retry button when onRetry is omitted", () => {
    renderWithUser(
      <TodayMetricStrip
        {...loadingData()}
        tasksStatus={{ type: "error", message: "Tasks unavailable." }}
      />,
    );

    expect(screen.getByText("Tasks unavailable.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("is wrapped in a region landmark with an accessible label", () => {
    renderWithUser(<TodayMetricStrip {...loadingData()} />);

    const region = screen.getByRole("region", { name: /today at a glance/i });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("tabindex", "0");
    expect(
      within(region).getAllByText(/today|tasks|scheduled|focus|active|week/i).length,
    ).toBeGreaterThan(0);
  });

  it("has no accessibility violations across loading, ready, error, and empty states", async () => {
    const { container, rerender } = renderWithUser(<TodayMetricStrip {...loadingData()} />);
    await expectNoAccessibilityViolations(container);

    rerender(
      <TodayMetricStrip
        mitStatus={{ type: "ready", value: "Write spec" }}
        tasksStatus={{ type: "ready", value: "4 / 6" }}
        scheduledTimeStatus={{ type: "ready", value: "2h 30m" }}
        focusTimeStatus={{ type: "ready", value: "45m" }}
        activeProjectsStatus={{ type: "ready", value: "3" }}
        weekProgressStatus={{ type: "ready", value: "60%" }}
      />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(
      <TodayMetricStrip
        {...loadingData()}
        mitStatus={{ type: "empty", message: "Choose today's focus" }}
        tasksStatus={{ type: "error", message: "Unavailable.", onRetry: () => {} }}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
