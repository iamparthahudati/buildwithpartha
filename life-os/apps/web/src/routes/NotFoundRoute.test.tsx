import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { NotFoundRoute } from "./NotFoundRoute";

function renderAt(variant: "public" | "private", path: string) {
  return renderWithUser(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<NotFoundRoute variant={variant} />} />
        <Route path="/life-os" element={<p>Public entry</p>} />
        <Route path="/life-os/app/today" element={<p>Today</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NotFoundRoute", () => {
  it("offers a Go to entry recovery for the public variant", async () => {
    const { user } = renderAt("public", "/life-os/not-a-real-page");

    expect(screen.getByText("Page not found")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Go to entry" }));
    expect(screen.getByText("Public entry")).toBeInTheDocument();
  });

  it("offers a Go to Today recovery for the private variant", async () => {
    const { user } = renderAt("private", "/life-os/app/not-a-real-page");

    await user.click(screen.getByRole("button", { name: "Go to Today" }));
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderAt("public", "/life-os/not-a-real-page");
    await expectNoAccessibilityViolations(container);
  });
});
