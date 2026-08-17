import { Users } from "lucide-react";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import { Link } from "@components/ui";

import { MetricCard } from "./MetricCard";

describe("MetricCard", () => {
  it("renders the label and value when ready", () => {
    renderWithUser(
      <MetricCard icon={Users} label="Open tasks" status={{ type: "ready", value: "42" }} />,
    );
    expect(screen.getByText("Open tasks")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("shows the period only alongside a ready value", () => {
    renderWithUser(
      <MetricCard
        label="Open tasks"
        status={{ type: "ready", value: "42" }}
        period="vs last 7 days"
      />,
    );
    expect(screen.getByText("vs last 7 days")).toBeInTheDocument();
  });

  it("does not show the period while loading", () => {
    renderWithUser(
      <MetricCard label="Open tasks" status={{ type: "loading" }} period="vs last 7 days" />,
    );
    expect(screen.queryByText("vs last 7 days")).not.toBeInTheDocument();
  });

  it("renders a positive trend with a visible value, an icon, and hidden direction text", () => {
    renderWithUser(
      <MetricCard
        label="Revenue"
        status={{ type: "ready", value: "$4,200" }}
        trend={{ direction: "up", value: "12%", isPositive: true }}
      />,
    );
    const trend = screen.getByText("12%").closest("span");
    expect(trend).toHaveClass("lifeos-metric-card__trend--positive");
    expect(screen.getByText("increase")).toBeInTheDocument();
  });

  it("renders a rising value as negative when a rise is bad news for this metric", () => {
    renderWithUser(
      <MetricCard
        label="Overdue tasks"
        status={{ type: "ready", value: "9" }}
        trend={{ direction: "up", value: "3", isPositive: false }}
      />,
    );
    const trend = screen.getByText("3").closest("span");
    expect(trend).toHaveClass("lifeos-metric-card__trend--negative");
  });

  it("renders a flat trend as neutral regardless of isPositive", () => {
    renderWithUser(
      <MetricCard
        label="Active users"
        status={{ type: "ready", value: "100" }}
        trend={{ direction: "flat", value: "0%", isPositive: true }}
      />,
    );
    const trend = screen.getByText("0%").closest("span");
    expect(trend).toHaveClass("lifeos-metric-card__trend--neutral");
    expect(screen.getByText("no change")).toBeInTheDocument();
  });

  it("does not render a trend row without a ready status", () => {
    renderWithUser(
      <MetricCard
        label="Revenue"
        status={{ type: "loading" }}
        trend={{ direction: "up", value: "12%", isPositive: true }}
      />,
    );
    expect(screen.queryByText("12%")).not.toBeInTheDocument();
  });

  it("shows a skeleton placeholder while loading, with the label still real visible text", () => {
    const { container } = renderWithUser(
      <MetricCard label="Open tasks" status={{ type: "loading" }} />,
    );
    expect(screen.getByText("Open tasks")).toBeInTheDocument();
    expect(container.querySelector(".lifeos-skeleton")).toBeInTheDocument();
  });

  it("shows the error message and an optional retry action", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <MetricCard
        label="Open tasks"
        status={{ type: "error", message: "Couldn't load this metric.", onRetry }}
      />,
    );

    expect(screen.getByText("Couldn't load this metric.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows no retry button when the error has none", () => {
    renderWithUser(
      <MetricCard label="Open tasks" status={{ type: "error", message: "Failed." }} />,
    );
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("shows a default empty message, or the caller's own", () => {
    const { rerender } = renderWithUser(
      <MetricCard label="Open tasks" status={{ type: "empty" }} />,
    );
    expect(screen.getByText("No data yet")).toBeInTheDocument();

    rerender(<MetricCard label="Open tasks" status={{ type: "empty", message: "Not tracked" }} />);
    expect(screen.getByText("Not tracked")).toBeInTheDocument();
  });

  it("renders the caller's own action as-is", () => {
    renderWithUser(
      <MetricCard
        label="Open tasks"
        status={{ type: "ready", value: "42" }}
        action={<Link href="/tasks">View all</Link>}
      />,
    );
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/tasks");
  });

  it("has no axe violations across every status", async () => {
    const { container, rerender } = renderWithUser(
      <MetricCard
        icon={Users}
        label="Open tasks"
        status={{ type: "ready", value: "42" }}
        period="vs last 7 days"
        trend={{ direction: "up", value: "12%", isPositive: true }}
        action={<Link href="/tasks">View all</Link>}
      />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(<MetricCard label="Open tasks" status={{ type: "loading" }} />);
    await expectNoAccessibilityViolations(container);

    rerender(
      <MetricCard
        label="Open tasks"
        status={{ type: "error", message: "Failed.", onRetry: () => {} }}
      />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(<MetricCard label="Open tasks" status={{ type: "empty" }} />);
    await expectNoAccessibilityViolations(container);
  });
});
