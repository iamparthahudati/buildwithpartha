import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { App } from "./App";

describe("App", () => {
  it("renders the foundation view with an accessible structure", async () => {
    const { container } = renderWithUser(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "Foundation ready" })).toBeVisible();
    await expectNoAccessibilityViolations(container);
  });

  it("offers the skip link as the first tab stop", async () => {
    const { user } = renderWithUser(<App />);

    await user.tab();

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveFocus();
  });

  it("points the skip link at a focusable main landmark outside the tab order", () => {
    renderWithUser(<App />);

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    const main = screen.getByRole("main");

    expect(skipLink).toHaveAttribute("href", `#${main.id}`);
    // -1 keeps the landmark out of the tab order while still allowing focus.
    expect(main).toHaveAttribute("tabindex", "-1");
  });
});
