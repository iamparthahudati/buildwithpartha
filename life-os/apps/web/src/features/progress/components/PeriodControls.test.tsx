import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { PeriodControls } from "./PeriodControls";
import type { ProgressFilterParams } from "../model/progress";

const DEFAULT_FILTER: ProgressFilterParams = {
  periodPreset: "THIS_MONTH",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  timeZone: "Asia/Kolkata",
};

describe("PeriodControls", () => {
  it("renders period preset buttons and passes accessibility audit", async () => {
    const handleChange = vi.fn();
    const { container } = render(<PeriodControls value={DEFAULT_FILTER} onChange={handleChange} />);

    expect(screen.getByRole("button", { name: "This Month" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("TZ: Asia/Kolkata")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("handles preset selection change", () => {
    const handleChange = vi.fn();
    render(<PeriodControls value={DEFAULT_FILTER} onChange={handleChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        periodPreset: "TODAY",
      }),
    );
  });
});
