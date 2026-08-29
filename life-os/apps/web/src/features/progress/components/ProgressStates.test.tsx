import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { ProgressEmptyState } from "./ProgressEmptyState";
import { ProgressErrorState } from "./ProgressErrorState";

describe("ProgressEmptyState and ProgressErrorState", () => {
  it("renders empty state and passes accessibility audit", async () => {
    const { container } = render(<ProgressEmptyState />);

    expect(screen.getByText("No progress data for selected period")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders error state with retry and passes accessibility audit", async () => {
    const handleRetry = vi.fn();
    const { container } = render(<ProgressErrorState onRetry={handleRetry} />);

    expect(screen.getByText("Unable to load progress data")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });
});
