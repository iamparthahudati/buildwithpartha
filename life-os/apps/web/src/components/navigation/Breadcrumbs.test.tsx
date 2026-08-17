import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Breadcrumbs } from "./Breadcrumbs";
import type { BreadcrumbItem } from "./breadcrumbsCollapse";

const SHORT_TRAIL: readonly BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Website refresh", href: "/projects/website-refresh" },
];

const LONG_TRAIL: readonly BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Website refresh", href: "/projects/website-refresh" },
  { label: "Tasks", href: "/projects/website-refresh/tasks" },
  { label: "Fix header", href: "/projects/website-refresh/tasks/fix-header" },
];

describe("Breadcrumbs", () => {
  it("renders a labelled nav with an ordered list", () => {
    renderWithUser(<Breadcrumbs items={SHORT_TRAIL} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("list")).toBeInTheDocument();
  });

  it("renders every item but the last as a real link", () => {
    renderWithUser(<Breadcrumbs items={SHORT_TRAIL} />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
  });

  it("renders the last item as plain text marked as the current page, not a link", () => {
    renderWithUser(<Breadcrumbs items={SHORT_TRAIL} />);
    expect(screen.queryByRole("link", { name: "Website refresh" })).not.toBeInTheDocument();
    const current = screen.getByText("Website refresh");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("collapses the middle of a long trail behind an expand control", () => {
    renderWithUser(<Breadcrumbs items={LONG_TRAIL} maxVisible={4} />);

    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Projects" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Website refresh" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show 1 hidden breadcrumb/ })).toBeInTheDocument();
  });

  it("reveals the full trail once the expand control is activated", async () => {
    const { user } = renderWithUser(<Breadcrumbs items={LONG_TRAIL} maxVisible={4} />);

    await user.click(screen.getByRole("button", { name: /Show 1 hidden breadcrumb/ }));

    expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hidden breadcrumb/ })).not.toBeInTheDocument();
  });

  it("does not collapse a trail that already fits within maxVisible", () => {
    renderWithUser(<Breadcrumbs items={SHORT_TRAIL} maxVisible={4} />);
    expect(screen.queryByRole("button", { name: /hidden breadcrumb/ })).not.toBeInTheDocument();
  });

  it("has no axe violations, collapsed or expanded", async () => {
    const { container, user } = renderWithUser(<Breadcrumbs items={LONG_TRAIL} maxVisible={4} />);
    await expectNoAccessibilityViolations(container);

    await user.click(screen.getByRole("button", { name: /hidden breadcrumb/ }));
    await expectNoAccessibilityViolations(container);
  });
});
