import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { SprintWeekSummary } from "./SprintWeekSummary";

describe("SprintWeekSummary", () => {
  it("keeps Sprint and Week states independent and routes their retries separately", async () => {
    const onRetrySprint = vi.fn();
    const { user } = renderWithUser(
      <SprintWeekSummary
        sprintState={{ type: "error", message: "Sprint data is unavailable." }}
        weekState={{ type: "empty" }}
        locale="en-US"
        onRetrySprint={onRetrySprint}
      />,
    );

    const sprintRegion = screen.getByRole("region", { name: "Current sprint" });
    const weekRegion = screen.getByRole("region", { name: "This week" });
    expect(within(sprintRegion).getByText("Current sprint couldn't load.")).toBeInTheDocument();
    expect(within(weekRegion).getByText("No Weekly Plan yet")).toBeInTheDocument();
    await user.click(within(sprintRegion).getByRole("button", { name: "Try again" }));
    expect(onRetrySprint).toHaveBeenCalledOnce();
  });

  it("has a useful section landmark and no accessibility violations", async () => {
    const { container } = renderWithUser(
      <SprintWeekSummary
        sprintState={{ type: "empty" }}
        weekState={{ type: "empty" }}
        locale="en-US"
      />,
    );

    expect(screen.getByRole("region", { name: "Sprint and week" })).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });
});
