import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Divider } from "./Divider";
import { ProgressBar } from "./ProgressBar";
import { ProgressRing } from "./ProgressRing";
import { readProgress } from "./progress";
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonText } from "./Skeleton";
import { Spinner } from "./Spinner";

describe("readProgress", () => {
  it("clamps a value into its range", () => {
    expect(readProgress(-4, 10).value).toBe(0);
    expect(readProgress(14, 10).value).toBe(10);
    expect(readProgress(4, 10).ratio).toBe(0.4);
  });

  it("survives a maximum that cannot divide", () => {
    // A metric with nothing to measure against must still render an empty bar,
    // and must not report itself complete just because the divisor is missing.
    expect(readProgress(3, 0).ratio).toBe(0);
    expect(readProgress(3, -1).percent).toBe(0);
    expect(readProgress(3, Number.NaN).percent).toBe(0);
    expect(readProgress(Number.NaN, 10).value).toBe(0);
  });

  it("never rounds away from the truth at either end", () => {
    // 99.6% beside a list that still has work in it must not read as done…
    expect(readProgress(996, 1000).percent).toBe(99);
    // …and a project that has genuinely started must not read as untouched.
    expect(readProgress(4, 1000).percent).toBe(1);

    expect(readProgress(0, 10).percent).toBe(0);
    expect(readProgress(10, 10).percent).toBe(100);
  });
});

describe("ProgressBar", () => {
  it("reports its value against a named metric", async () => {
    const { container } = renderWithUser(
      <ProgressBar label="Weekly plan capacity" value={6} max={8} showValue />,
    );

    const bar = screen.getByRole("progressbar", { name: "Weekly plan capacity" });
    expect(bar).toHaveAttribute("aria-valuenow", "6");
    expect(bar).toHaveAttribute("aria-valuemax", "8");
    await expectNoAccessibilityViolations(container);
  });

  it("announces what the value means rather than a bare percentage", () => {
    renderWithUser(
      <ProgressBar label="Sprint commitment" value={3} max={8} valueText="3 of 8 tasks done" />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "3 of 8 tasks done");
  });

  it("reports no value at all while it is indeterminate", async () => {
    const { container } = renderWithUser(
      <ProgressBar label="Preparing your export" indeterminate />,
    );

    const bar = screen.getByRole("progressbar", { name: "Preparing your export" });
    // Reporting zero would claim the work has not started, which is a
    // different thing from not knowing how far along it is.
    expect(bar).not.toHaveAttribute("aria-valuenow");
    await expectNoAccessibilityViolations(container);
  });

  it("keeps its label available when it is visually hidden", () => {
    renderWithUser(<ProgressBar label="Storage used" labelHidden value={50} />);

    expect(screen.getByRole("progressbar", { name: "Storage used" })).toBeInTheDocument();
    expect(screen.getByText("Storage used")).toHaveClass("lifeos-visually-hidden");
  });

  it("shows the value only when asked, and never while indeterminate", () => {
    const { rerender } = renderWithUser(<ProgressBar label="Storage used" value={40} />);
    expect(screen.queryByText("40%")).not.toBeInTheDocument();

    rerender(<ProgressBar label="Storage used" value={40} showValue />);
    expect(screen.getByText("40%")).toBeInTheDocument();

    rerender(<ProgressBar label="Storage used" indeterminate showValue />);
    expect(screen.queryByText("40%")).not.toBeInTheDocument();
  });

  it("hides the value along with the label it belongs to", () => {
    renderWithUser(<ProgressBar label="Storage used" labelHidden showValue value={40} />);

    // "40%" of what? A percentage with no metric beside it cannot be read.
    expect(screen.queryByText("40%")).not.toBeInTheDocument();
  });
});

describe("ProgressRing", () => {
  it("reports the same reading a bar would", async () => {
    const { container } = renderWithUser(
      <ProgressRing label="Habits this week" value={6} max={8} valueText="6 of 8 habits" />,
    );

    const ring = screen.getByRole("progressbar", { name: "Habits this week" });
    expect(ring).toHaveAttribute("aria-valuenow", "6");
    expect(ring).toHaveAttribute("aria-valuetext", "6 of 8 habits");
    await expectNoAccessibilityViolations(container);
  });

  it("does not announce the centre text twice", () => {
    renderWithUser(<ProgressRing label="Habits this week" value={6} max={8} />);

    // The percentage is already in aria-valuetext; the painted copy is decoration.
    expect(screen.getByText("75%")).toHaveAttribute("aria-hidden", "true");
  });

  it("handles an empty and a complete ring without pretending either way", () => {
    const { container, rerender } = renderWithUser(
      <ProgressRing label="Goal progress" value={0} />,
    );
    expect(container.querySelector(".lifeos-progress-ring__dial")).toHaveClass("is-empty");

    rerender(<ProgressRing label="Goal progress" value={100} />);
    expect(container.querySelector(".lifeos-progress-ring__dial")).toHaveClass("is-complete");
  });

  it("drives the arc from one custom property", () => {
    const { container } = renderWithUser(<ProgressRing label="Goal progress" value={25} />);

    expect(container.querySelector(".lifeos-progress-ring__dial")).toHaveStyle({
      "--lifeos-progress-ratio": "0.25",
    });
  });
});

describe("Spinner", () => {
  it("carries its waiting copy inside the live region, not as an attribute", async () => {
    const { container } = renderWithUser(<Spinner label="Loading tasks…" />);

    // A live region announces the text it contains, so the label has to be
    // real content rather than an aria-label on an empty shape.
    expect(screen.getByRole("status")).toHaveTextContent("Loading tasks…");
    await expectNoAccessibilityViolations(container);
  });

  it("hides its label by default and shows it on request", () => {
    const { rerender } = renderWithUser(<Spinner label="Loading tasks…" />);
    expect(screen.getByText("Loading tasks…")).toHaveClass("lifeos-visually-hidden");

    rerender(<Spinner label="Loading tasks…" labelVisible />);
    expect(screen.getByText("Loading tasks…")).not.toHaveClass("lifeos-visually-hidden");
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive technology", async () => {
    const { container } = renderWithUser(<Skeleton shape="block" />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    await expectNoAccessibilityViolations(container);
  });

  it("reserves the space it is given", () => {
    const { container } = renderWithUser(<Skeleton width="12rem" height="3rem" />);

    expect(container.firstElementChild).toHaveStyle({ inlineSize: "12rem", blockSize: "3rem" });
  });

  it("ends a paragraph on a short line, as a real one does", () => {
    const { container } = renderWithUser(<SkeletonText lines={3} />);

    const lines = container.querySelectorAll(".lifeos-skeleton--line");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toHaveStyle({ inlineSize: "60%" });
  });

  it("never renders fewer than one line, whatever it is asked for", () => {
    const { container } = renderWithUser(<SkeletonText lines={0} />);

    expect(container.querySelectorAll(".lifeos-skeleton--line")).toHaveLength(1);
  });

  it("reserves a card's media slot only when the card has one", () => {
    const { container, rerender } = renderWithUser(<SkeletonCard />);
    expect(container.querySelector(".lifeos-skeleton--circle")).toBeNull();

    rerender(<SkeletonCard withMedia />);
    expect(container.querySelector(".lifeos-skeleton--circle")).not.toBeNull();
  });

  it("lays out table rows without inventing table markup", async () => {
    const { container } = renderWithUser(<SkeletonTable rows={4} columns={3} />);

    // An empty table with no headers would be markup assistive technology
    // tries to describe; these are plain reserved boxes.
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelectorAll(".lifeos-skeleton-table__row")).toHaveLength(4);
    expect(container.querySelectorAll(".lifeos-skeleton--line")).toHaveLength(12);
    await expectNoAccessibilityViolations(container);
  });
});

describe("Divider", () => {
  it("is silent by default", () => {
    const { container } = renderWithUser(<Divider />);

    // The grouping is already carried by headings and list structure.
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("takes the separator role when the line carries the structure", () => {
    const { container } = renderWithUser(<Divider semantic />);

    // A horizontal rule already has the role; adding one would be redundant.
    expect(container.querySelector("hr")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("says so when it is vertical, which an hr cannot be", () => {
    renderWithUser(<Divider semantic orientation="vertical" />);

    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("names a labelled break without saying it twice", async () => {
    const { container } = renderWithUser(<Divider label="Earlier" />);

    expect(screen.getByRole("separator", { name: "Earlier" })).toBeInTheDocument();
    expect(screen.getByText("Earlier")).toHaveAttribute("aria-hidden", "true");
    await expectNoAccessibilityViolations(container);
  });
});
