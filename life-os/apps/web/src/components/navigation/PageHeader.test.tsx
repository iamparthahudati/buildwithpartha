import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import { Badge, Button } from "@components/ui";

import { PageHeader } from "./PageHeader";
import type { MenuItemDescriptor } from "./Menu";

describe("PageHeader", () => {
  it("renders the title as the page's h1", () => {
    renderWithUser(<PageHeader title="Website refresh" />);
    expect(screen.getByRole("heading", { level: 1, name: "Website refresh" })).toBeInTheDocument();
  });

  it("renders caller-supplied description and metadata", () => {
    renderWithUser(
      <PageHeader
        title="Website refresh"
        description="Every task related to the marketing site relaunch."
        metadata={<Badge tone="success">Active</Badge>}
      />,
    );
    expect(
      screen.getByText("Every task related to the marketing site relaunch."),
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders no description or metadata block when neither is given", () => {
    renderWithUser(<PageHeader title="Website refresh" />);
    expect(screen.queryByText(/marketing site/)).not.toBeInTheDocument();
  });

  it("renders a breadcrumb trail above the title when given", () => {
    renderWithUser(
      <PageHeader
        title="Website refresh"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: "Website refresh", href: "/projects/website-refresh" },
        ]}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });

  it("renders no breadcrumb nav when none is given", () => {
    renderWithUser(<PageHeader title="Website refresh" />);
    expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).not.toBeInTheDocument();
  });

  it("renders the caller's own primary action as-is", async () => {
    const onArchive = vi.fn();
    const { user } = renderWithUser(
      <PageHeader
        title="Website refresh"
        primaryAction={<Button onClick={onArchive}>Archive project</Button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Archive project" }));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it("renders secondary actions behind a single overflow menu", async () => {
    const onDuplicate = vi.fn();
    const secondaryActions: readonly MenuItemDescriptor[] = [
      { type: "item", id: "duplicate", label: "Duplicate project", onSelect: onDuplicate },
      { type: "item", id: "export", label: "Export data", onSelect: () => {} },
    ];
    const { user } = renderWithUser(
      <PageHeader title="Website refresh" secondaryActions={secondaryActions} />,
    );

    const trigger = screen.getByRole("button", { name: "More actions" });
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();

    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Duplicate project" }));
    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });

  it("renders no actions row at all when neither is given", () => {
    renderWithUser(<PageHeader title="Website refresh" />);
    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
  });

  it("has no axe violations with every slot filled", async () => {
    const { container } = renderWithUser(
      <PageHeader
        title="Website refresh"
        description="Every task related to the marketing site relaunch."
        metadata={<Badge tone="success">Active</Badge>}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Projects", href: "/projects" },
        ]}
        primaryAction={<Button>Archive project</Button>}
        secondaryActions={[
          { type: "item", id: "duplicate", label: "Duplicate project", onSelect: () => {} },
        ]}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
