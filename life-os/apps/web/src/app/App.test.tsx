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
});
