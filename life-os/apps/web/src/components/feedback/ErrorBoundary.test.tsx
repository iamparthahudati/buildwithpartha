import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ErrorBoundary } from "./ErrorBoundary";

function Bomb(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React logs the caught error to console.error by design; this test
    // intentionally triggers one and asserts the UI, not the log.
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders children when nothing throws", () => {
    renderWithUser(
      <ErrorBoundary>
        <p>Real content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Real content")).toBeInTheDocument();
  });

  it("renders a page-scoped ErrorState fallback when a child throws, never the raw error", () => {
    renderWithUser(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("boom")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
  });

  it("reloads the page when Reload is activated", async () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadSpy });

    const { user } = renderWithUser(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole("button", { name: "Reload page" }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it("has no accessibility violations in its fallback state", async () => {
    const { container } = renderWithUser(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    await expectNoAccessibilityViolations(container);
  });
});
