import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { WeeklyOutcome } from "../model/weekPlanner";
import { WeeklyOutcomes } from "./WeeklyOutcomes";

const OUTCOMES: readonly WeeklyOutcome[] = [
  {
    id: "outcome-1",
    title: "Prepare the accessibility review",
    selected: true,
    itemCount: 2,
  },
  {
    id: "outcome-2",
    title: "Finish the learning plan",
    selected: true,
    itemCount: 1,
  },
  {
    id: "outcome-3",
    title: "Organize home records",
    selected: false,
  },
];

describe("WeeklyOutcomes", () => {
  it("selects outcomes and adds a specific new outcome", async () => {
    const onToggleOutcome = vi.fn();
    const onAddOutcome = vi.fn();
    const { user } = renderWithUser(
      <WeeklyOutcomes
        outcomes={OUTCOMES}
        onToggleOutcome={onToggleOutcome}
        onAddOutcome={onAddOutcome}
      />,
    );

    expect(screen.getByText("2 selected weekly outcomes")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Organize home records" }));
    expect(onToggleOutcome).toHaveBeenCalledWith("outcome-3", true);

    await user.type(screen.getByLabelText("Outcome"), "Complete keyboard review");
    await user.click(screen.getByRole("button", { name: "Add outcome" }));
    expect(onAddOutcome).toHaveBeenCalledWith("Complete keyboard review");
  });

  it("preserves the field and explains an invalid add", async () => {
    const { user } = renderWithUser(<WeeklyOutcomes outcomes={OUTCOMES} onAddOutcome={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Add outcome" }));
    expect(screen.getByText("Enter an outcome.")).toBeInTheDocument();
    expect(screen.getByLabelText("Outcome")).toHaveValue("");
  });

  it("offers named buttons and an Alt+Arrow keyboard equivalent for reordering", async () => {
    const onMoveOutcome = vi.fn();
    const { user } = renderWithUser(
      <WeeklyOutcomes outcomes={OUTCOMES} onMoveOutcome={onMoveOutcome} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Move Prepare the accessibility review down" }),
    );
    expect(onMoveOutcome).toHaveBeenCalledWith("outcome-1", "down");

    fireEvent.keyDown(screen.getByRole("checkbox", { name: /Finish the learning plan/ }), {
      key: "ArrowUp",
      altKey: true,
    });
    expect(onMoveOutcome).toHaveBeenCalledWith("outcome-2", "up");
  });

  it("keeps successful outcomes visible when one mutation fails and offers a scoped retry", async () => {
    const onRetryOutcome = vi.fn();
    const failed: readonly WeeklyOutcome[] = [
      OUTCOMES[0]!,
      {
        ...OUTCOMES[1]!,
        mutation: {
          type: "failed",
          message: "We couldn't save this outcome. Your choice is still here.",
        },
      },
    ];
    const { user } = renderWithUser(
      <WeeklyOutcomes outcomes={failed} onRetryOutcome={onRetryOutcome} />,
    );

    expect(screen.getByText("Prepare the accessibility review")).toBeInTheDocument();
    expect(
      screen.getByText("We couldn't save this outcome. Your choice is still here."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry outcome" }));
    expect(onRetryOutcome).toHaveBeenCalledWith("outcome-2");
  });

  it("renders loading and recoverable load-error states", async () => {
    const { rerender, user } = renderWithUser(<WeeklyOutcomes loading />);
    expect(screen.getByRole("region", { name: "Weekly outcomes" })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    const onRetry = vi.fn();
    rerender(
      <WeeklyOutcomes error="Other planning sections are still available." onRetry={onRetry} />,
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <WeeklyOutcomes
        outcomes={OUTCOMES}
        onToggleOutcome={vi.fn()}
        onAddOutcome={vi.fn()}
        onMoveOutcome={vi.fn()}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
