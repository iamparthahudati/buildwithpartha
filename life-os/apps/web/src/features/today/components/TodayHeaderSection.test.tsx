import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TodayHeaderSection, type TodayHeaderSectionProps } from "./TodayHeaderSection";

const BASE_PROPS: TodayHeaderSectionProps = {
  displayName: "Priya",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  subtitle: "See what needs attention and choose what to do next.",
  now: new Date("2026-08-20T03:30:00Z"),
  onQuickAddClick: () => {},
  mitStatus: { type: "empty", message: "No focus chosen yet." },
  tasksStatus: { type: "ready", value: "2 of 4" },
  scheduledTimeStatus: { type: "loading" },
  focusTimeStatus: { type: "error", message: "Focus time couldn't load." },
  activeProjectsStatus: { type: "ready", value: "2" },
  weekProgressStatus: { type: "empty", message: "No Weekly Plan yet." },
};

describe("TodayHeaderSection", () => {
  it("composes the greeting, helper, and metric strip in order", () => {
    const { container } = renderWithUser(<TodayHeaderSection {...BASE_PROPS} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good morning, Priya");
    expect(
      screen.getByText("See what needs attention and choose what to do next."),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Today at a glance" })).toBeInTheDocument();
    expect(container.querySelector(".lifeos-today-header")?.nextElementSibling).toHaveClass(
      "lifeos-today-metric-strip",
    );
  });

  it("forwards the Quick Add action and a metric retry independently", async () => {
    const onQuickAddClick = vi.fn();
    const onRetryFocusTime = vi.fn();
    const { user } = renderWithUser(
      <TodayHeaderSection
        {...BASE_PROPS}
        onQuickAddClick={onQuickAddClick}
        onRetryFocusTime={onRetryFocusTime}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Quick Add" }));
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(onQuickAddClick).toHaveBeenCalledTimes(1);
    expect(onRetryFocusTime).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations across mixed states", async () => {
    const { container } = renderWithUser(<TodayHeaderSection {...BASE_PROPS} />);
    await expectNoAccessibilityViolations(container);
  });
});
