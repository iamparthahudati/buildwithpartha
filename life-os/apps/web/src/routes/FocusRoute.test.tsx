import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";

import { FocusRoute } from "./FocusRoute";

const integrated = vi.hoisted(() => vi.fn());
vi.mock("@features/focus", () => ({
  IntegratedFocusMode: (props: unknown) => {
    integrated(props);
    return <h1>Integrated Focus Mode</h1>;
  },
}));

const AUTH: AuthSessionValue = {
  user: {
    id: "user-1",
    email: "focus@example.com",
    displayName: "Focus Tester",
    timeZone: "Asia/Kolkata",
    locale: "en-IN",
    weekStart: 1,
  },
  csrfToken: "csrf",
  isBootstrapping: false,
  setSession: vi.fn(),
  clearSession: vi.fn(),
};

describe("FocusRoute", () => {
  it("passes canonical deep-link context and the Account locale", () => {
    render(
      <AuthSessionContext.Provider value={AUTH}>
        <MemoryRouter initialEntries={["/life-os/app/focus?taskId=task-1&timeBlockId=block-1"]}>
          <Routes>
            <Route path="/life-os/app/focus" element={<FocusRoute />} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Integrated Focus Mode" })).toBeInTheDocument();
    expect(integrated).toHaveBeenCalledWith({
      locale: "en-IN",
      taskId: "task-1",
      timeBlockId: "block-1",
    });
  });
});
