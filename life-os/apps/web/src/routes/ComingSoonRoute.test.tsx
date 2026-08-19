import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ComingSoonRoute } from "./ComingSoonRoute";

describe("ComingSoonRoute", () => {
  it("renders the resolved route title as the page heading and an honest not-built message", () => {
    renderWithUser(
      <MemoryRouter initialEntries={["/life-os/app/tasks"]}>
        <ComingSoonRoute />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByText("This screen has not been built yet.")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <MemoryRouter initialEntries={["/life-os/app/goals"]}>
        <ComingSoonRoute />
      </MemoryRouter>,
    );

    await expectNoAccessibilityViolations(container);
  });
});
