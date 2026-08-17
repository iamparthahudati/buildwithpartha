import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import { Button } from "@components/ui";

import { Alert } from "./Alert";

describe("Alert", () => {
  it("renders the body and stays silent by default", async () => {
    const { container } = renderWithUser(
      <Alert tone="info">Today's schedule is up to date.</Alert>,
    );

    expect(screen.getByText("Today's schedule is up to date.")).toBeInTheDocument();
    // No live-region role: content that is simply part of the page must not
    // announce itself as an interruption the instant it mounts.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("shows an optional heading above the body", () => {
    renderWithUser(
      <Alert tone="danger" heading="Save failed">
        Your changes are still here.
      </Alert>,
    );

    expect(screen.getByText("Save failed")).toBeInTheDocument();
    expect(screen.getByText("Your changes are still here.")).toBeInTheDocument();
  });

  it("renders a caller-supplied action", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <Alert tone="danger" action={<Button onClick={onRetry}>Try again</Button>}>
        We couldn't save this Task.
      </Alert>,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows a dismiss control only when asked for one", async () => {
    const onDismiss = vi.fn();
    const { user, rerender } = renderWithUser(<Alert tone="info">Nothing due today.</Alert>);
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();

    rerender(
      <Alert tone="info" onDismiss={onDismiss}>
        Nothing due today.
      </Alert>,
    );
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("names the dismiss control specifically when several alerts could be open", () => {
    renderWithUser(
      <Alert tone="warning" onDismiss={() => {}} dismissLabel="Dismiss storage warning">
        You are near your storage limit.
      </Alert>,
    );

    expect(screen.getByRole("button", { name: "Dismiss storage warning" })).toBeInTheDocument();
  });

  it("announces assertively only when explicitly asked to", async () => {
    const { container } = renderWithUser(
      <Alert tone="danger" announce="alert">
        We couldn't save this Task. Your changes are still here.
      </Alert>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't save this Task.");
    await expectNoAccessibilityViolations(container);
  });

  it("announces politely, not assertively, when asked for status", () => {
    renderWithUser(
      <Alert tone="success" announce="status">
        Changes saved.
      </Alert>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not remount, and therefore cannot re-announce, when its own content updates in place", () => {
    const { container, rerender } = renderWithUser(
      <Alert tone="danger" announce="alert">
        Enter a task title.
      </Alert>,
    );
    const firstNode = container.querySelector(".lifeos-alert");

    // The same logical alert changing its message — e.g. a second failed
    // validation replacing the first — must update in place. A parent that
    // tore the element down and rebuilt it here would cause most screen
    // readers to treat the still-visible alert as freshly inserted content
    // and announce it again for no new reason.
    rerender(
      <Alert tone="danger" announce="alert">
        Title too long.
      </Alert>,
    );

    expect(container.querySelector(".lifeos-alert")).toBe(firstNode);
    expect(screen.getByRole("alert")).toHaveTextContent("Title too long.");
  });

  it("carries every tone's own icon without describing it twice", async () => {
    const { container } = renderWithUser(<Alert tone="warning">Storage is nearly full.</Alert>);

    const icon = container.querySelector(".lifeos-alert__icon");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    await expectNoAccessibilityViolations(container);
  });
});
