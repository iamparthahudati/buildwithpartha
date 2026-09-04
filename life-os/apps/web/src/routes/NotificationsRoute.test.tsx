import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { renderWithUser } from "@test/render";

import { NotificationsRoute } from "./NotificationsRoute";

vi.mock("@features/notifications", () => ({
  NotificationsScreen: (props: {
    onNavigateTarget: (url: string) => void;
    onOpenSettings: () => void;
  }) => {
    return (
      <div data-testid="mock-notifications-screen">
        <button type="button" onClick={() => props.onNavigateTarget("/life-os/app/tasks/1")}>
          Open Target Task
        </button>
        <button type="button" onClick={() => props.onOpenSettings()}>
          Open Notification Settings
        </button>
      </div>
    );
  },
}));

describe("NotificationsRoute", () => {
  it("mounts NotificationsScreen and wires navigation callbacks", async () => {
    const { user } = renderWithUser(
      <MemoryRouter initialEntries={["/life-os/app/notifications"]}>
        <Routes>
          <Route path="/life-os/app/notifications" element={<NotificationsRoute />} />
          <Route path="/life-os/app/tasks/:id" element={<div>Task Screen</div>} />
          <Route
            path="/life-os/app/settings/notifications"
            element={<div>Notification Settings Screen</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("mock-notifications-screen")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Target Task" }));
    expect(screen.getByText("Task Screen")).toBeInTheDocument();
  });

  it("navigates to settings when onOpenSettings is triggered", async () => {
    const { user } = renderWithUser(
      <MemoryRouter initialEntries={["/life-os/app/notifications"]}>
        <Routes>
          <Route path="/life-os/app/notifications" element={<NotificationsRoute />} />
          <Route
            path="/life-os/app/settings/notifications"
            element={<div>Notification Settings Screen</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Open Notification Settings" }));
    expect(screen.getByText("Notification Settings Screen")).toBeInTheDocument();
  });
});
