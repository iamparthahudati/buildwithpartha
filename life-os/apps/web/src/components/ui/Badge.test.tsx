import { screen } from "@testing-library/react";
import { Flag } from "lucide-react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Badge, CountBadge, DecorativeStatusDot, StatusDot } from "./Badge";
import { BADGE_TONES, PRIORITY_TONE, TASK_STATUS_TONE } from "./scales";

describe("Badge", () => {
  it("always renders its text, so colour is never the only signal", async () => {
    const { container } = renderWithUser(<Badge tone="danger">Blocked</Badge>);

    expect(screen.getByText("Blocked")).toBeVisible();
    await expectNoAccessibilityViolations(container);
  });

  it("renders every tone", () => {
    for (const tone of BADGE_TONES) {
      const { unmount } = renderWithUser(<Badge tone={tone}>Label</Badge>);
      expect(screen.getByText("Label")).toHaveClass(`lifeos-badge--${tone}`);
      unmount();
    }
  });

  it("keeps the dot and icon decorative", () => {
    renderWithUser(
      <Badge tone="warning" dot icon={Flag}>
        P1 — High
      </Badge>,
    );

    // The visible text is the whole accessible content.
    expect(screen.getByText("P1 — High")).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("status and priority tones", () => {
  it("maps every canonical task status", () => {
    expect(Object.keys(TASK_STATUS_TONE).sort()).toEqual([
      "BLOCKED",
      "CANCELLED",
      "DONE",
      "IN_PROGRESS",
      "TO_DO",
    ]);
  });

  it("maps every canonical priority and reserves danger for P1", () => {
    expect(Object.keys(PRIORITY_TONE).sort()).toEqual(["P1", "P2", "P3", "P4"]);
    expect(PRIORITY_TONE.P1).toBe("danger");
    expect(PRIORITY_TONE.P3).toBe("neutral");
  });
});

describe("StatusDot", () => {
  it("carries its meaning in words, because a dot alone says nothing", async () => {
    const { container } = renderWithUser(<StatusDot tone="success" label="Done" />);

    expect(screen.getByRole("img", { name: "Done" })).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("stays silent when adjacent text already states the status", () => {
    renderWithUser(
      <span>
        <DecorativeStatusDot tone="info" /> In progress
      </span>,
    );

    // Otherwise the status would be announced twice.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("CountBadge", () => {
  it("names what it is counting", async () => {
    const { container } = renderWithUser(<CountBadge count={3} label="unread notifications" />);

    expect(screen.getByText("3 unread notifications")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("clamps the visible number but still announces the exact count", () => {
    renderWithUser(<CountBadge count={148} label="unread notifications" />);

    expect(screen.getByText("99+")).toBeInTheDocument();
    expect(screen.getByText("148 unread notifications")).toBeInTheDocument();
  });

  it("respects a custom maximum", () => {
    renderWithUser(<CountBadge count={12} max={9} label="overdue tasks" />);

    expect(screen.getByText("9+")).toBeInTheDocument();
  });
});
