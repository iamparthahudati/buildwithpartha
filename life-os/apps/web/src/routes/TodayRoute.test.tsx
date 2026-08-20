import { screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TodayRoute } from "./TodayRoute";

/**
 * TodayRoute (LOS-0608).
 *
 * Route tests mock all dependencies at module level following the same
 * `SettingsRoute.test.tsx` pattern — no local helper components are declared
 * inside a routes/ file (the boundary verifier enforces that routes/ files
 * may only export *Route composition components).
 */

vi.mock("@features/today", () => ({
  TodayHeaderSection: (props: {
    displayName: string;
    timeZone: string;
    locale: string;
    subtitle: string;
    onQuickAddClick: () => void;
    mitStatus: { message?: string };
    tasksStatus: { message?: string };
    scheduledTimeStatus: { message?: string };
    focusTimeStatus: { message?: string };
    activeProjectsStatus: { message?: string };
    weekProgressStatus: { message?: string };
  }) => (
    <div data-testid="today-header-section">
      <p>displayName: {props.displayName}</p>
      <p>timeZone: {props.timeZone}</p>
      <p>locale: {props.locale}</p>
      <p>{props.subtitle}</p>
      <p>{props.mitStatus.message}</p>
      <p>{props.tasksStatus.message}</p>
      <p>{props.scheduledTimeStatus.message}</p>
      <p>{props.focusTimeStatus.message}</p>
      <p>{props.activeProjectsStatus.message}</p>
      <p>{props.weekProgressStatus.message}</p>
      <button type="button" onClick={props.onQuickAddClick}>
        Quick Add
      </button>
    </div>
  ),
}));

vi.mock("@state/authSession", () => ({
  useAuthSession: () => ({
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      email: "account@example.test",
      displayName: "Partha",
      timeZone: "Asia/Kolkata",
      locale: "en-IN",
      weekStart: 1,
    },
    csrfToken: "test-token",
    setSession: vi.fn(),
    clearSession: vi.fn(),
  }),
}));

function renderRoute(onQuickAddClick = vi.fn()) {
  return renderWithUser(
    <MemoryRouter>
      <Routes>
        <Route element={<Outlet context={{ onQuickAddClick }} />}>
          <Route index element={<TodayRoute />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("TodayRoute", () => {
  it("renders TodayHeaderSection with the authenticated user's identity", () => {
    renderRoute();

    expect(screen.getByTestId("today-header-section")).toBeInTheDocument();
    expect(screen.getByText("displayName: Partha")).toBeInTheDocument();
    expect(screen.getByText("timeZone: Asia/Kolkata")).toBeInTheDocument();
    expect(screen.getByText("locale: en-IN")).toBeInTheDocument();
  });

  it("renders the approved Today helper and honest foundation empty states", () => {
    renderRoute();

    expect(
      screen.getByText("See what needs attention and choose what to do next."),
    ).toBeInTheDocument();
    expect(screen.getByText("No focus chosen yet.")).toBeInTheDocument();
    expect(screen.getByText("No tasks planned for today.")).toBeInTheDocument();
    expect(screen.getByText("No Time Blocks scheduled today.")).toBeInTheDocument();
    expect(screen.getByText("No focus time recorded today.")).toBeInTheDocument();
    expect(screen.getByText("No active projects yet.")).toBeInTheDocument();
    expect(screen.getByText("No Weekly Plan yet.")).toBeInTheDocument();
  });

  it("opens the shell-owned Quick Add dialog from the header trigger", async () => {
    const onQuickAddClick = vi.fn();
    const { user } = renderRoute(onQuickAddClick);

    await user.click(screen.getByRole("button", { name: "Quick Add" }));
    expect(onQuickAddClick).toHaveBeenCalledTimes(1);
  });

  it("renders the route's own container element", () => {
    const { container } = renderRoute();
    expect(container.querySelector(".lifeos-today-route")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderRoute();
    await expectNoAccessibilityViolations(container);
  });
});
