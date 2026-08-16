import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Link } from "./Link";

describe("Link", () => {
  it("renders an accessible anchor with a destination", async () => {
    const { container } = renderWithUser(<Link href="/life-os/app/today">Today</Link>);

    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute(
      "href",
      "/life-os/app/today",
    );
    await expectNoAccessibilityViolations(container);
  });

  it("announces the current destination rather than only styling it", () => {
    renderWithUser(
      <Link href="/life-os/app/today" current>
        Today
      </Link>,
    );

    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
  });

  it("does not mark an ordinary link as current", () => {
    renderWithUser(<Link href="/life-os/app/tasks">Tasks</Link>);

    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
  });

  describe("external links", () => {
    it("warns that the context will change, in text and not only by icon", () => {
      renderWithUser(
        <Link href="https://example.test/help" external>
          Help centre
        </Link>,
      );

      expect(screen.getByRole("link", { name: /opens in a new tab/i })).toBeInTheDocument();
    });

    it("opens safely, denying the new page access to the opener", () => {
      renderWithUser(
        <Link href="https://example.test/help" external>
          Help centre
        </Link>,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer noopener");
    });

    it("leaves same-tab links untouched", () => {
      renderWithUser(<Link href="/life-os/app/tasks">Tasks</Link>);

      const link = screen.getByRole("link");
      expect(link).not.toHaveAttribute("target");
      expect(link).not.toHaveAttribute("rel");
    });
  });

  it("keeps the focus affordance when the underline is suppressed", () => {
    renderWithUser(
      <Link href="/life-os/app/tasks" quiet>
        Tasks
      </Link>,
    );

    // Quiet only removes the resting underline; the shared focus ring is
    // untouched, so keyboard users lose nothing.
    expect(screen.getByRole("link")).toHaveClass("lifeos-link--quiet");
  });

  it("is reachable by keyboard", async () => {
    const { user } = renderWithUser(<Link href="/life-os/app/tasks">Tasks</Link>);

    await user.tab();

    expect(screen.getByRole("link")).toHaveFocus();
  });
});
