import { Search } from "lucide-react";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import { Button, Link } from "@components/ui";

import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the caller's own title and description, never invented copy", async () => {
    const { container } = renderWithUser(
      <EmptyState
        variant="first-use"
        title="No projects yet"
        description="Add a project to organize related outcomes and Tasks."
      />,
    );

    expect(screen.getByText("No projects yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add a project to organize related outcomes and Tasks."),
    ).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("keeps the title out of the page outline until a level is given", () => {
    renderWithUser(<EmptyState variant="filtered" title="No tasks match these filters." />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("No tasks match these filters.")).toBeInTheDocument();
  });

  it("joins the page outline as a real heading once a level is given", () => {
    renderWithUser(<EmptyState variant="first-use" title="No projects yet" titleLevel={2} />);

    expect(screen.getByRole("heading", { level: 2, name: "No projects yet" })).toBeInTheDocument();
  });

  it("falls back to a sensible default icon per variant", () => {
    const { container } = renderWithUser(
      <EmptyState variant="permission" title="This item isn't available." />,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("lets a caller override the icon", () => {
    const { container } = renderWithUser(
      <EmptyState variant="first-use" title="No results" icon={Search} />,
    );

    expect(container.querySelector(".lifeos-empty-state__icon")).toBeInTheDocument();
  });

  it("renders no icon at all when explicitly told not to", () => {
    const { container } = renderWithUser(
      <EmptyState variant="first-use" title="No projects yet" icon={false} />,
    );

    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("shows a primary and a secondary action independently", async () => {
    const onAdd = vi.fn();
    const { user } = renderWithUser(
      <EmptyState
        variant="first-use"
        title="No projects yet"
        primaryAction={<Button onClick={onAdd}>Add project</Button>}
        secondaryAction={<Link href="#">Learn more</Link>}
      />,
    );

    expect(screen.getByRole("link", { name: "Learn more" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add project" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("shows no action region when neither action is supplied", () => {
    const { container } = renderWithUser(
      <EmptyState variant="archived" title="Nothing archived yet" />,
    );

    expect(container.querySelector(".lifeos-empty-state__actions")).not.toBeInTheDocument();
  });

  it("echoes a search query safely as plain caller-supplied text", () => {
    renderWithUser(
      <EmptyState
        variant="search"
        title={`No results for "Prepare weekly review"`}
        description="Try fewer words or add a new record."
      />,
    );

    expect(screen.getByText('No results for "Prepare weekly review"')).toBeInTheDocument();
  });
});
