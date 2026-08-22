import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { renderWithUser } from "@test/render";

import { SettingsRoute } from "./SettingsRoute";

vi.mock("@features/settings", () => ({
  SettingsScreen: (props: { initialSection?: string; onSectionChange: (s: string) => void }) => {
    return (
      <div>
        <p>Section: {props.initialSection ?? "(none)"}</p>
        <button type="button" onClick={() => props.onSectionChange("security")}>
          Go to security
        </button>
      </div>
    );
  },
}));

describe("SettingsRoute", () => {
  it("passes the :section URL param through as initialSection", () => {
    renderWithUser(
      <MemoryRouter initialEntries={["/life-os/app/settings/privacy"]}>
        <Routes>
          <Route path="/life-os/app/settings/:section?" element={<SettingsRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Section: privacy")).toBeInTheDocument();
  });

  it("omits initialSection when no :section param is present", () => {
    renderWithUser(
      <MemoryRouter initialEntries={["/life-os/app/settings"]}>
        <Routes>
          <Route path="/life-os/app/settings/:section?" element={<SettingsRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Section: (none)")).toBeInTheDocument();
  });

  it("navigates to the section's own URL when the section changes", async () => {
    const { user } = renderWithUser(
      <MemoryRouter initialEntries={["/life-os/app/settings/privacy"]}>
        <Routes>
          <Route path="/life-os/app/settings/:section?" element={<SettingsRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Go to security" }));
    expect(screen.getByText("Section: security")).toBeInTheDocument();
  });
});
