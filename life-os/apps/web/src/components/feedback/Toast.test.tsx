import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import type { ToastEntry } from "@state/toastQueue";

import { Toast } from "./Toast";

/*
 * Real, short durations rather than fake timers: userEvent's own internal
 * delays and axe's async checks both stall indefinitely under fake timers
 * unless every one of them is individually configured to advance the mocked
 * clock, which is more fragile than a few tens of milliseconds of real wait.
 */

function entry(overrides: Partial<ToastEntry> = {}): ToastEntry {
  return {
    id: "toast-1",
    tone: "success",
    message: "Task added.",
    durationMs: 6000,
    updatedAt: Date.now(),
    ...overrides,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Toast", () => {
  it("renders as an Alert carrying its message", async () => {
    const { container } = renderWithUser(<Toast entry={entry()} onDismiss={() => {}} />);

    expect(screen.getByText("Task added.")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("announces politely for info/success and assertively for warning/danger", () => {
    const { rerender } = renderWithUser(
      <Toast entry={entry({ tone: "success" })} onDismiss={() => {}} />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(<Toast entry={entry({ tone: "danger", id: "toast-2" })} onDismiss={() => {}} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("dismisses itself when its duration elapses", async () => {
    const onDismiss = vi.fn();
    renderWithUser(<Toast entry={entry({ durationMs: 30 })} onDismiss={onDismiss} />);

    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith("toast-1"));
  });

  it("never auto-dismisses a persistent toast", async () => {
    const onDismiss = vi.fn();
    renderWithUser(<Toast entry={entry({ durationMs: null })} onDismiss={onDismiss} />);

    await wait(60);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("pauses its countdown while hovered", async () => {
    const onDismiss = vi.fn();
    const { user } = renderWithUser(
      <Toast entry={entry({ durationMs: 30 })} onDismiss={onDismiss} />,
    );

    await user.hover(screen.getByText("Task added."));
    await wait(80);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("resumes with only the time that was left once the pointer leaves", async () => {
    const onDismiss = vi.fn();
    const { user } = renderWithUser(
      <Toast entry={entry({ durationMs: 60 })} onDismiss={onDismiss} />,
    );
    const message = screen.getByText("Task added.");

    await user.hover(message);
    await wait(20);
    await user.unhover(message);

    // Roughly 40ms of the original 60ms remain; well before that has passed
    // it must still be showing.
    await wait(10);
    expect(onDismiss).not.toHaveBeenCalled();

    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith("toast-1"));
  });

  it("pauses its countdown while a control inside it has focus", async () => {
    const onDismiss = vi.fn();
    const { user } = renderWithUser(
      <Toast entry={entry({ durationMs: 30 })} onDismiss={onDismiss} />,
    );

    // Tabbing to the dismiss button focuses an element inside the toast,
    // which must pause it exactly as hovering does — a keyboard user reading
    // a toast is no less "using" it than a mouse user hovering one.
    await user.tab();
    await wait(80);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("resumes once focus leaves the toast", async () => {
    const onDismiss = vi.fn();
    const { user } = renderWithUser(
      <>
        <Toast entry={entry({ durationMs: 40 })} onDismiss={onDismiss} />
        <button type="button">Elsewhere</button>
      </>,
    );

    await user.tab();
    await wait(20);
    await user.tab();

    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith("toast-1"));
  });

  it("stays paused through a refresh that arrives while the pointer is still on it", async () => {
    const onDismiss = vi.fn();
    const { user, rerender } = renderWithUser(
      <Toast entry={entry({ durationMs: 30 })} onDismiss={onDismiss} />,
    );

    await user.hover(screen.getByText("Task added."));

    // The same notification pushed again — a new `updatedAt` — while the
    // pointer never left. The timer hook always resumes on that reset;
    // without Toast correcting it back to paused, the countdown would run
    // unpaused underneath a toast the user is still looking at.
    rerender(
      <Toast entry={entry({ durationMs: 30, updatedAt: Date.now() + 1 })} onDismiss={onDismiss} />,
    );
    await wait(80);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("dismisses on a click of its own dismiss control", async () => {
    const onDismiss = vi.fn();
    const { user } = renderWithUser(<Toast entry={entry()} onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));

    expect(onDismiss).toHaveBeenCalledWith("toast-1");
  });
});
