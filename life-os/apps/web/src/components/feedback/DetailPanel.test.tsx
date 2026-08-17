import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { DetailPanel } from "./DetailPanel";

describe("DetailPanel", () => {
  it("shows a busy status while content is still resolving", async () => {
    const { container } = renderWithUser(
      <DetailPanel open onClose={() => {}} title="Prepare weekly review" content={undefined} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    await expectNoAccessibilityViolations(container);
  });

  it("shows the not-found state without confirming whether the record exists", async () => {
    const { container } = renderWithUser(
      <DetailPanel open onClose={() => {}} title="Task" content={null} />,
    );

    expect(screen.getByText("This item isn't available.")).toBeInTheDocument();
    expect(
      screen.getByText("It may have been removed, or you may not have access."),
    ).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("renders the resolved content once it is available", () => {
    renderWithUser(
      <DetailPanel
        open
        onClose={() => {}}
        title="Prepare weekly review"
        content={<p>Due Friday.</p>}
      />,
    );

    expect(screen.getByText("Due Friday.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("This item isn't available.")).not.toBeInTheDocument();
  });

  it("passes every other Drawer prop straight through, including the dirty guard", async () => {
    const { user } = renderWithUser(
      <DetailPanel
        open
        onClose={() => {}}
        title="Prepare weekly review"
        content={<p>Due Friday.</p>}
        isDirty
      />,
    );

    await user.keyboard("{Escape}");

    expect(screen.getByRole("dialog", { name: "Discard unsaved changes?" })).toBeInTheDocument();
  });
});
