import { screen } from "@testing-library/react";
import { CheckCircle2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ActivityFeed, type ActivityEvent } from "./ActivityFeed";

const NOW = new Date("2026-08-18T18:00:00.000Z");

const EVENTS: readonly ActivityEvent[] = [
  {
    id: "e1",
    actorName: "Ada Lovelace",
    action: "archived",
    object: { label: "Website refresh", href: "#projects/website-refresh" },
    createdAt: "2026-08-18T17:00:00.000Z",
    icon: CheckCircle2,
  },
  {
    id: "e2",
    actorName: "Grace Hopper",
    action: "commented on",
    createdAt: "2026-08-17T09:00:00.000Z",
  },
];

const BASE_PROPS = {
  label: "Recent activity",
  locale: "en-US",
  timeZone: "UTC",
  emptyTitle: "No activity yet",
  now: NOW,
};

describe("ActivityFeed", () => {
  it("renders a real, labelled ordered list of day groups", () => {
    renderWithUser(<ActivityFeed {...BASE_PROPS} events={EVENTS} />);
    const list = screen.getByRole("list", { name: "Recent activity" });
    expect(list.tagName).toBe("OL");
  });

  it("groups events under Today/Yesterday day labels", () => {
    renderWithUser(<ActivityFeed {...BASE_PROPS} events={EVENTS} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });

  it("renders actor, action and a real link to the object", () => {
    renderWithUser(<ActivityFeed {...BASE_PROPS} events={EVENTS} />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("archived")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Website refresh" });
    expect(link).toHaveAttribute("href", "#projects/website-refresh");
  });

  it("renders a safe, non-linked fallback for a deleted object", () => {
    renderWithUser(<ActivityFeed {...BASE_PROPS} events={EVENTS} />);
    expect(screen.getByText("a deleted item")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "a deleted item" })).not.toBeInTheDocument();
  });

  it("gives the accessible timestamp label the full absolute date", () => {
    renderWithUser(<ActivityFeed {...BASE_PROPS} events={EVENTS} />);
    expect(screen.getByText("1 hour ago")).toHaveAttribute("aria-label", "Aug 18, 2026, 5:00 PM");
  });

  it("shows an EmptyState when there are no events", () => {
    renderWithUser(<ActivityFeed {...BASE_PROPS} events={[]} />);
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Recent activity" })).not.toBeInTheDocument();
  });

  it("shows a loading state with an announced live region instead of the list", () => {
    renderWithUser(<ActivityFeed {...BASE_PROPS} events={[]} status={{ type: "loading" }} />);
    expect(screen.getByText("Loading Recent activity…")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Recent activity" })).not.toBeInTheDocument();
  });

  it("shows an ErrorState with retry when status is error", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <ActivityFeed
        {...BASE_PROPS}
        events={[]}
        status={{ type: "error", message: "Network error.", onRetry }}
      />,
    );
    expect(screen.getByText("Network error.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps a day label as plain text by default and a real heading when groupHeadingLevel is given", () => {
    const { rerender } = renderWithUser(<ActivityFeed {...BASE_PROPS} events={EVENTS} />);
    expect(screen.queryByRole("heading", { name: "Today" })).not.toBeInTheDocument();

    rerender(<ActivityFeed {...BASE_PROPS} events={EVENTS} groupHeadingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3, name: "Today" })).toBeInTheDocument();
  });

  it("composes Pagination when a pagination config is given", async () => {
    const onPageChange = vi.fn();
    const { user } = renderWithUser(
      <ActivityFeed
        {...BASE_PROPS}
        events={EVENTS}
        pagination={{ page: 1, pageSize: 10, total: 30, onPageChange }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("has no axe violations across ready, loading, error and empty", async () => {
    const { container, rerender } = renderWithUser(
      <ActivityFeed {...BASE_PROPS} events={EVENTS} />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(<ActivityFeed {...BASE_PROPS} events={[]} status={{ type: "loading" }} />);
    await expectNoAccessibilityViolations(container);

    rerender(
      <ActivityFeed
        {...BASE_PROPS}
        events={[]}
        status={{ type: "error", message: "Network error." }}
      />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(<ActivityFeed {...BASE_PROPS} events={[]} />);
    await expectNoAccessibilityViolations(container);
  });
});
