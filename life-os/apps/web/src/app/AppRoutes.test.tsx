import { useEffect, type ReactNode } from "react";

import { cleanup, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { renderWithUser } from "@test/render";
import { useAuthSession, type AuthUser } from "@state/authSession";

import { AppProviders } from "./AppProviders";
import { AppRoutes } from "./AppRouter";
import { ROUTE_LOADERS } from "./routeLoaders";

/**
 * The router table itself is the unit under test here — every leaf screen
 * it mounts already has its own dedicated test suite (LOS-0509 onward), so
 * each is replaced with a minimal, distinctively-labelled stand-in. This
 * keeps the suite about routing/gating/composition, not re-proving screen
 * internals (form validation, data fetching) that never touch the router.
 */
vi.mock("@features/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@features/auth")>();
  return {
    ...actual,
    SignupScreen: () => <p>Signup screen</p>,
    LoginScreen: () => <p>Login screen</p>,
    VerifyEmailScreen: () => <p>Verify email screen</p>,
    ForgotPasswordScreen: () => <p>Forgot password screen</p>,
    ResetPasswordScreen: () => <p>Reset password screen</p>,
  };
});

vi.mock("@features/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@features/settings")>();
  return {
    ...actual,
    SettingsScreen: (props: { initialSection?: string }) => (
      <p>Settings screen: {props.initialSection ?? "none"}</p>
    ),
    AccountDeletionCancelScreen: () => <p>Cancel deletion screen</p>,
  };
});

vi.mock("@features/onboarding", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@features/onboarding")>();
  return { ...actual, OnboardingScreen: () => <p>Onboarding screen</p> };
});

vi.mock("@features/today", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@features/today")>();
  return {
    ...actual,
    TodayScreen: () => <h1>Today</h1>,
    useToday: () => ({ isPending: true, refetch: vi.fn() }),
    useTodayOnlineStatus: () => true,
  };
});

const MOCK_USER: AuthUser = {
  id: "user-1",
  email: "priya@example.com",
  displayName: "Priya Sharma",
  timeZone: "Asia/Kolkata",
  locale: "en-US",
  weekStart: 1,
};

function SessionSeeder({ children }: { readonly children: ReactNode }) {
  const { setSession } = useAuthSession();
  useEffect(() => {
    setSession(MOCK_USER, "test-csrf-token");
  }, [setSession]);
  return <>{children}</>;
}

function renderAt(path: string, options: { readonly signedIn?: boolean } = {}) {
  cleanup();
  const routed = (
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );

  return renderWithUser(
    <AppProviders>
      {options.signedIn ? <SessionSeeder>{routed}</SessionSeeder> : routed}
    </AppProviders>,
  );
}

describe("AppRoutes", () => {
  it("renders public routes with no authentication required", async () => {
    renderAt("/life-os/signup");
    expect(await screen.findByText("Signup screen")).toBeInTheDocument();

    renderAt("/life-os/login");
    expect(await screen.findByText("Login screen")).toBeInTheDocument();

    renderAt("/life-os/verify-email");
    expect(await screen.findByText("Verify email screen")).toBeInTheDocument();

    renderAt("/life-os/forgot-password");
    expect(await screen.findByText("Forgot password screen")).toBeInTheDocument();

    renderAt("/life-os/reset-password");
    expect(await screen.findByText("Reset password screen")).toBeInTheDocument();

    renderAt("/life-os/cancel-deletion");
    expect(await screen.findByText("Cancel deletion screen")).toBeInTheDocument();

    renderAt("/life-os/unavailable");
    expect(await screen.findByText("LifeOS is temporarily unavailable")).toBeInTheDocument();
  });

  it("shows a public Not Found page for an unmatched public path", async () => {
    renderAt("/life-os/this-page-does-not-exist");

    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Go to entry" })).toBeInTheDocument();
  });

  it("redirects an unmatched top-level path into the LifeOS public entry", async () => {
    renderAt("/somewhere-outside-life-os");
    expect(await screen.findByRole("heading", { level: 1, name: "LifeOS" })).toBeInTheDocument();
  });

  it("renders no protected content for a signed-out visitor", () => {
    renderAt("/life-os/app/today");

    expect(screen.queryByText("This screen has not been built yet.")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Sidebar navigation" }),
    ).not.toBeInTheDocument();
  });

  it("renders a protected route inside AppShell for a signed-in visitor", async () => {
    renderAt("/life-os/app/today", { signedIn: true });

    expect(await screen.findByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Sidebar navigation" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("redirects the default /app path to Today", async () => {
    renderAt("/life-os/app", { signedIn: true });
    expect(await screen.findByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
  });

  it("shows a private Not Found page inside the shell for an unmatched protected path", async () => {
    renderAt("/life-os/app/this-does-not-exist", { signedIn: true });

    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Go to Today" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Sidebar navigation" })).toBeInTheDocument();
  });

  it("renders Onboarding as a protected route without the shell chrome", async () => {
    renderAt("/life-os/app/onboarding", { signedIn: true });

    expect(await screen.findByText("Onboarding screen")).toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Sidebar navigation" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("wires the :section param through to Settings", async () => {
    renderAt("/life-os/app/settings/security", { signedIn: true });
    expect(await screen.findByText("Settings screen: security")).toBeInTheDocument();
  });

  it.each(["/life-os/privacy", "/life-os/terms"])(
    "renders placeholder route for %s",
    async (path) => {
      renderAt(path);
      expect(await screen.findByText("This screen has not been built yet.")).toBeInTheDocument();
    },
  );

  it("executes all route lazy loaders correctly and resolves valid component functions", async () => {
    const loaderPromises = Object.entries(ROUTE_LOADERS).map(async ([name, loader]) => {
      const module = await loader();
      expect(typeof module.default).toBe("function");
      return name;
    });
    const loadedRouteNames = await Promise.all(loaderPromises);
    expect(loadedRouteNames.length).toBe(Object.keys(ROUTE_LOADERS).length);
  });
});
