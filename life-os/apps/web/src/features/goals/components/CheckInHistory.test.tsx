import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { CheckInHistory } from "./CheckInHistory";
import type { GoalCheckIn } from "../model/goal";

const MOCK_CHECKINS: GoalCheckIn[] = [
  {
    id: "checkin-2",
    goalId: "goal-1",
    userId: "user-1",
    value: 75,
    note: "Completed sprint 12 and merged PRs",
    recordedAt: "2026-08-20T10:00:00Z",
  },
  {
    id: "checkin-1",
    goalId: "goal-1",
    userId: "user-1",
    value: 50,
    note: "Initial milestone hit",
    recordedAt: "2026-08-10T10:00:00Z",
  },
];

describe("CheckInHistory", () => {
  it("renders check-in history items and delta badges", async () => {
    const onAddCheckIn = vi.fn();
    const { container } = render(
      <CheckInHistory checkIns={MOCK_CHECKINS} unit="%" onAddCheckIn={onAddCheckIn} />,
    );

    expect(screen.getByText("Check-in History (2)")).toBeInTheDocument();
    expect(screen.getByText("Completed sprint 12 and merged PRs")).toBeInTheDocument();
    expect(screen.getByText("+25")).toBeInTheDocument();

    const addBtn = screen.getByRole("button", { name: "Log Check-in" });
    await userEvent.click(addBtn);
    expect(onAddCheckIn).toHaveBeenCalled();

    await expectNoAccessibilityViolations(container);
  });

  it("renders empty state when no check-ins exist", async () => {
    const { container } = render(<CheckInHistory checkIns={[]} />);
    expect(screen.getByText("No check-ins logged yet")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });
});
