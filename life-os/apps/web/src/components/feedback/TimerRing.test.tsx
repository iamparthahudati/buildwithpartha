import { useState } from "react";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TimerRing, type TimerRingStatus } from "./TimerRing";

interface ControlledTimerRingProps {
  readonly initialStatus?: TimerRingStatus;
  readonly initialRemaining?: number;
}

function ControlledTimerRing({
  initialStatus = "idle",
  initialRemaining = 1500,
}: ControlledTimerRingProps) {
  const [status, setStatus] = useState<TimerRingStatus>(initialStatus);
  const [remaining, setRemaining] = useState(initialRemaining);

  return (
    <TimerRing
      label="Focus session"
      totalSeconds={1500}
      remainingSeconds={remaining}
      status={status}
      locale="en-US"
      onStart={() => setStatus("running")}
      onPause={() => setStatus("paused")}
      onResume={() => setStatus("running")}
      onReset={() => {
        setStatus("idle");
        setRemaining(1500);
      }}
    />
  );
}

describe("TimerRing", () => {
  it("renders the clock in the ring's center and only the Start action while idle", () => {
    renderWithUser(<ControlledTimerRing />);

    expect(screen.getByText("25:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("Start switches to running and shows only Pause", async () => {
    const { user } = renderWithUser(<ControlledTimerRing />);

    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("Pause switches to paused and shows Resume and Reset", async () => {
    const { user } = renderWithUser(<ControlledTimerRing initialStatus="running" />);

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("Reset returns to idle", async () => {
    const { user } = renderWithUser(<ControlledTimerRing initialStatus="paused" />);

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("a completed timer shows only Reset", () => {
    renderWithUser(<ControlledTimerRing initialStatus="completed" initialRemaining={0} />);

    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resume" })).not.toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("formats an hour-plus duration with an hours segment", () => {
    renderWithUser(
      <TimerRing
        label="Deep work"
        totalSeconds={5400}
        remainingSeconds={3661}
        status="running"
        locale="en-US"
      />,
    );

    expect(screen.getByText("1:01:01")).toBeInTheDocument();
  });

  it("announces a status transition once, but never the running countdown itself", () => {
    function renderAt(status: TimerRingStatus, remainingSeconds: number) {
      return (
        <TimerRing
          label="Focus session"
          totalSeconds={1500}
          remainingSeconds={remainingSeconds}
          status={status}
          locale="en-US"
        />
      );
    }

    vi.useFakeTimers();
    try {
      const { rerender } = renderWithUser(renderAt("idle", 1500));

      // No announcement on mount.
      expect(screen.getByRole("status")).toHaveTextContent("");

      rerender(renderAt("running", 1500));
      expect(screen.getByRole("status")).toHaveTextContent("Focus session resumed.");

      // Re-rendering with only remainingSeconds changing — the same prop a
      // real ticking caller would update every second — must not re-announce
      // anything; the tone guide forbids announcing every tick.
      rerender(renderAt("running", 1499));
      rerender(renderAt("running", 1498));
      expect(screen.getByRole("status")).toHaveTextContent("Focus session resumed.");

      // Outside useAnnouncer's quiet window, so this second, distinct
      // announcement is not held behind the first.
      vi.advanceTimersByTime(500);
      rerender(renderAt("paused", 1498));
      expect(screen.getByRole("status")).toHaveTextContent("Focus session paused.");
    } finally {
      vi.useRealTimers();
    }
  });

  it("announces completion", () => {
    const { rerender } = renderWithUser(
      <TimerRing
        label="Focus session"
        totalSeconds={1500}
        remainingSeconds={1}
        status="running"
        locale="en-US"
      />,
    );

    rerender(
      <TimerRing
        label="Focus session"
        totalSeconds={1500}
        remainingSeconds={0}
        status="completed"
        locale="en-US"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Focus session completed.");
  });

  it("clamps remainingSeconds within [0, totalSeconds] for display", () => {
    renderWithUser(
      <TimerRing
        label="Focus session"
        totalSeconds={1500}
        remainingSeconds={-30}
        status="completed"
        locale="en-US"
      />,
    );

    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("an action with no handler prop is not rendered even when its status is active", () => {
    renderWithUser(
      <TimerRing
        label="Focus session"
        totalSeconds={1500}
        remainingSeconds={1500}
        status="idle"
        locale="en-US"
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithUser(<ControlledTimerRing initialStatus="running" />);
    await expectNoAccessibilityViolations(container);
  });
});

describe("TimerRing formatClock/spokenRemaining", () => {
  it("is exercised indirectly through rendered center text and aria-valuetext", () => {
    renderWithUser(
      <TimerRing
        label="Focus session"
        totalSeconds={1500}
        remainingSeconds={65}
        status="paused"
        locale="en-US"
      />,
    );

    expect(screen.getByText("1:05")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "1 min 5 sec remaining, paused.",
    );
  });
});
