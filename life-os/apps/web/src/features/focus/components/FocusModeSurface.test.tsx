import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { FocusModeSurface, type FocusModeSurfaceProps } from "./FocusModeSurface";

const BASE_PROPS: FocusModeSurfaceProps = {
  locale: "en-IN",
  status: "running",
  phase: "focus",
  totalSeconds: 1500,
  remainingSeconds: 1042,
  settings: { focusMinutes: 25, breakMinutes: 5 },
  context: {
    task: { title: "Draft project outline", href: "/life-os/app/tasks/task-outline" },
    timeBlock: {
      title: "Project planning",
      localTime: "2:00 PM–2:30 PM",
      href: "/life-os/app/time-blocks?date=2026-08-24",
    },
  },
  interruptionNote: "",
};

function renderSurface(overrides: Partial<FocusModeSurfaceProps> = {}) {
  return renderWithUser(<FocusModeSurface {...BASE_PROPS} {...overrides} />);
}

describe("FocusModeSurface", () => {
  it("renders a running Focus Session with linked context and controlled actions", async () => {
    const onPause = vi.fn();
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    const { user, rerender } = renderSurface({ onPause, onComplete, onCancel });

    expect(screen.getByRole("heading", { level: 1, name: "Focus Mode" })).toBeInTheDocument();
    expect(screen.getByText("Draft project outline")).toHaveAttribute(
      "href",
      "/life-os/app/tasks/task-outline",
    );
    expect(screen.getByText("Project planning")).toBeInTheDocument();
    expect(screen.getByText("2:00 PM–2:30 PM")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(onPause).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Complete session" }));
    const completeDialog = screen.getByRole("dialog", {
      name: "Complete this Focus Session?",
    });
    expect(completeDialog).toHaveTextContent("The Task will not be marked done.");
    await user.click(within(completeDialog).getByRole("button", { name: "Complete session" }));
    expect(onComplete).toHaveBeenCalledOnce();
    rerender(
      <FocusModeSurface
        {...BASE_PROPS}
        status="completed"
        remainingSeconds={0}
        onStart={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("dialog", { name: "Complete this Focus Session?" }),
    ).not.toBeInTheDocument();

    rerender(<FocusModeSurface {...BASE_PROPS} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Cancel session" }));
    const cancelDialog = screen.getByRole("dialog", { name: "Cancel this Focus Session?" });
    expect(cancelDialog).toHaveTextContent("keep its truthful duration in history");
    await user.click(within(cancelDialog).getByRole("button", { name: "Cancel session" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("renders pause/resume and break-specific controls without focus-only assumptions", async () => {
    const onResume = vi.fn();
    const onSkipBreak = vi.fn();
    const { user } = renderSurface({
      status: "paused",
      phase: "break",
      totalSeconds: 300,
      remainingSeconds: 180,
      onResume,
      onSkipBreak,
    });

    expect(screen.getByRole("heading", { name: "Break" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    await user.click(screen.getByRole("button", { name: "Skip break" }));
    expect(onResume).toHaveBeenCalledOnce();
    expect(onSkipBreak).toHaveBeenCalledOnce();
  });

  it("captures a private distraction note and enforces the 2,000-character limit", async () => {
    const onInterruptionNoteChange = vi.fn();
    const onSaveInterruption = vi.fn();
    const { user, rerender } = renderSurface({
      interruptionNote: "Check the message later",
      onInterruptionNoteChange,
      onSaveInterruption,
    });

    await user.type(screen.getByRole("textbox", { name: "Distraction note (optional)" }), ".");
    expect(onInterruptionNoteChange).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Save distraction" }));
    expect(onSaveInterruption).toHaveBeenCalledOnce();

    rerender(
      <FocusModeSurface
        {...BASE_PROPS}
        interruptionNote={"a".repeat(2001)}
        onInterruptionNoteChange={onInterruptionNoteChange}
        onSaveInterruption={onSaveInterruption}
      />,
    );
    expect(
      screen.getByText("Keep the distraction note to 2,000 characters or fewer."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save distraction" })).toBeDisabled();
  });

  it("requests browser notification consent only from the explicit action", async () => {
    const onRequestNotificationPermission = vi.fn();
    const { user, rerender } = renderSurface({
      notificationPermission: "default",
      onRequestNotificationPermission,
    });

    expect(onRequestNotificationPermission).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Allow notifications" }));
    expect(onRequestNotificationPermission).toHaveBeenCalledOnce();

    rerender(
      <FocusModeSurface
        {...BASE_PROPS}
        notificationPermission="denied"
        onRequestNotificationPermission={onRequestNotificationPermission}
      />,
    );
    expect(screen.getByText(/notifications are blocked/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Allow notifications" })).not.toBeInTheDocument();
  });

  it("edits bounded next-session settings while idle", async () => {
    const onSettingsChange = vi.fn();
    const { user } = renderSurface({
      status: "idle",
      remainingSeconds: 1500,
      onStart: vi.fn(),
      onSettingsChange,
    });

    await user.click(screen.getByRole("button", { name: "Session settings" }));
    const dialog = screen.getByRole("dialog", { name: "Session settings" });
    const focusInput = within(dialog).getByRole("spinbutton", { name: /Focus duration/ });
    await user.clear(focusInput);
    await user.type(focusInput, "45");
    await user.click(within(dialog).getByRole("button", { name: "Apply settings" }));
    expect(onSettingsChange).toHaveBeenCalledWith({ focusMinutes: 45, breakMinutes: 5 });
    expect(screen.queryByRole("dialog", { name: "Session settings" })).not.toBeInTheDocument();
  });

  it("shows honest loading, recovery, disabled, completed, and cancelled states", async () => {
    const onRetry = vi.fn();
    const { user, rerender } = renderSurface({ loading: true });
    expect(screen.getByText("Loading the active Focus Session…")).toBeInTheDocument();

    rerender(
      <FocusModeSurface {...BASE_PROPS} loading={false} loadError="Try again." onRetry={onRetry} />,
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(
      <FocusModeSurface
        {...BASE_PROPS}
        disabledReason="Reconnect before changing this Focus Session."
        onPause={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();

    rerender(
      <FocusModeSurface
        {...BASE_PROPS}
        status="completed"
        remainingSeconds={0}
        recordedFocusMinutes={25}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByText("25 min recorded.")).toBeInTheDocument();

    rerender(<FocusModeSurface {...BASE_PROPS} status="cancelled" remainingSeconds={900} />);
    expect(screen.getByText(/did not add confirmed time/)).toBeInTheDocument();
  });

  it("has no automated accessibility violations in idle, active, break, and terminal states", async () => {
    const { container, rerender } = renderSurface({
      status: "idle",
      onStart: vi.fn(),
      onSettingsChange: vi.fn(),
    });
    await expectNoAccessibilityViolations(container);

    rerender(
      <FocusModeSurface
        {...BASE_PROPS}
        onPause={vi.fn()}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onInterruptionNoteChange={vi.fn()}
        onSaveInterruption={vi.fn()}
        notificationPermission="default"
        onRequestNotificationPermission={vi.fn()}
      />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(
      <FocusModeSurface {...BASE_PROPS} phase="break" onPause={vi.fn()} onSkipBreak={vi.fn()} />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(
      <FocusModeSurface
        {...BASE_PROPS}
        status="completed"
        remainingSeconds={0}
        recordedFocusMinutes={25}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
