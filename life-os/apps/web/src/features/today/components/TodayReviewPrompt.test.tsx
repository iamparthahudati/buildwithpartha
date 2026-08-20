import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TodayReviewPrompt, type TodayReviewData } from "./TodayReviewPrompt";

const REVIEW_DATA: TodayReviewData = {
  morning: { state: "FINALIZED", href: "/life-os/app/reviews/daily/morning" },
  evening: { state: "DRAFT", href: "/life-os/app/reviews/daily/evening" },
  suggestedPeriod: "evening",
};

describe("TodayReviewPrompt", () => {
  it("shows morning and evening state with the appropriate actions", () => {
    renderWithUser(
      <TodayReviewPrompt
        status={{ type: "ready", data: REVIEW_DATA }}
        reviewsHref="/life-os/app/reviews"
      />,
    );

    expect(screen.getByRole("heading", { name: "Daily review" })).toBeInTheDocument();
    expect(screen.getByText("Morning review")).toBeInTheDocument();
    expect(screen.getByText("Finalized")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open morning review" })).toHaveAttribute(
      "href",
      "/life-os/app/reviews/daily/morning",
    );
    expect(screen.getByText("Evening review")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Suggested now")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resume evening review" })).toHaveAttribute(
      "href",
      "/life-os/app/reviews/daily/evening",
    );
  });

  it("uses start and open actions for not-started and skipped states", () => {
    renderWithUser(
      <TodayReviewPrompt
        status={{
          type: "ready",
          data: {
            morning: { state: "NOT_STARTED", href: "/reviews/morning" },
            evening: { state: "SKIPPED", href: "/reviews/evening" },
            suggestedPeriod: "morning",
          },
        }}
        reviewsHref="/reviews"
      />,
    );

    expect(screen.getByRole("link", { name: "Start morning review" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open evening review" })).toBeInTheDocument();
    expect(screen.getByText(/Skipped for this local date/)).toBeInTheDocument();
  });

  it("renders a reserved loading state when no prior state is available", () => {
    const { container } = renderWithUser(
      <TodayReviewPrompt status={{ type: "loading" }} reviewsHref="/reviews" />,
    );

    expect(screen.getByRole("status", { name: "Loading Daily Review status" })).toBeInTheDocument();
    expect(container.querySelectorAll(".lifeos-skeleton-card")).toHaveLength(2);
  });

  it("keeps last-known Review state visible while refreshing", () => {
    renderWithUser(
      <TodayReviewPrompt status={{ type: "loading", data: REVIEW_DATA }} reviewsHref="/reviews" />,
    );

    expect(screen.getByText(/Last saved state remains available/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resume evening review" })).toBeInTheDocument();
  });

  it("isolates an error, retries it, and preserves last-known state", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <TodayReviewPrompt
        status={{ type: "error", message: "Review data is unavailable.", data: REVIEW_DATA }}
        reviewsHref="/reviews"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Daily Review status couldn't refresh.")).toBeInTheDocument();
    expect(screen.getByText("Your last saved Review state is still shown.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resume evening review" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows a recoverable error without inventing review state", () => {
    renderWithUser(
      <TodayReviewPrompt
        status={{
          type: "error",
          message: "Review status is unavailable. Open Reviews to continue.",
        }}
        reviewsHref="/reviews"
      />,
    );

    expect(
      screen.getByText("Review status is unavailable. Open Reviews to continue."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Morning review")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review history" })).toHaveAttribute(
      "href",
      "/reviews",
    );
  });

  it("has no accessibility violations in ready and preserved-error states", async () => {
    const { container, rerender } = renderWithUser(
      <TodayReviewPrompt status={{ type: "ready", data: REVIEW_DATA }} reviewsHref="/reviews" />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(
      <TodayReviewPrompt
        status={{ type: "error", message: "Review status is unavailable.", data: REVIEW_DATA }}
        reviewsHref="/reviews"
        onRetry={() => {}}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
