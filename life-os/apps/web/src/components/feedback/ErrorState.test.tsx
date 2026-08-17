import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("renders a region error as an Alert, keeping the rest of the page reachable", async () => {
    const { container } = renderWithUser(
      <ErrorState
        scope="region"
        title="Today's schedule couldn't load."
        description="Other Today sections are still available."
      />,
    );

    // A region error is an Alert lead-in, not a document heading — the rest
    // of the page around it is what stays in the real outline.
    expect(screen.getByText("Today's schedule couldn't load.")).toBeInTheDocument();
    expect(screen.getByText("Other Today sections are still available.")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("renders a page error as a larger centered block with its own heading level", async () => {
    const { container } = renderWithUser(
      <ErrorState scope="page" title="LifeOS couldn't load Tasks right now." />,
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "LifeOS couldn't load Tasks right now.",
    );
    await expectNoAccessibilityViolations(container);
  });

  it("offers retry with the tone guide's canonical label by default", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <ErrorState scope="page" title="LifeOS couldn't load Tasks right now." onRetry={onRetry} />,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("lets a caller override the retry label without losing the handler", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <ErrorState
        scope="page"
        title="Too many attempts."
        onRetry={onRetry}
        retryLabel="Try again in 30 seconds"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Try again in 30 seconds" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers go back only when a handler is supplied, never a bare retry for a permanently missing item", async () => {
    const onGoBack = vi.fn();
    const { user } = renderWithUser(
      <ErrorState
        scope="page"
        title="This item isn't available."
        description="It may have been removed, or you may not have access."
        onGoBack={onGoBack}
      />,
    );

    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onGoBack).toHaveBeenCalledTimes(1);
  });

  it("offers sign-in for an expired session", async () => {
    const onSignIn = vi.fn();
    const { user } = renderWithUser(
      <ErrorState
        scope="page"
        title="Your session expired."
        description="Sign in again to continue."
        onSignIn={onSignIn}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it("shows a reference id as a safe correlation line, never raw error detail", () => {
    renderWithUser(
      <ErrorState
        scope="page"
        title="Something went wrong."
        description="Try again."
        correlationId="a1b2c3"
      />,
    );

    expect(screen.getByText("Reference ID:")).toBeInTheDocument();
    expect(screen.getByText("a1b2c3")).toBeInTheDocument();
  });

  it("shows no correlation line when none is given", () => {
    renderWithUser(<ErrorState scope="page" title="Something went wrong." />);

    expect(screen.queryByText(/Reference ID/)).not.toBeInTheDocument();
  });

  it("accepts an escape-hatch action for recovery beyond retry/back/sign-in", async () => {
    const onCompare = vi.fn();
    const { user } = renderWithUser(
      <ErrorState
        scope="region"
        title="This Task changed elsewhere."
        description="Your edits are still here."
        action={
          <button type="button" onClick={onCompare}>
            Compare changes
          </button>
        }
      />,
    );

    await user.click(screen.getByRole("button", { name: "Compare changes" }));
    expect(onCompare).toHaveBeenCalledTimes(1);
  });

  it("can combine retry with the escape-hatch action in one region error", () => {
    renderWithUser(
      <ErrorState
        scope="region"
        title="This Task changed elsewhere."
        onRetry={() => {}}
        retryLabel="Load latest"
        action={<button type="button">Copy my changes</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Load latest" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy my changes" })).toBeInTheDocument();
  });
});
