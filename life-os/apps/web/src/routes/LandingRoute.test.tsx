import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";
import { LandingRoute } from "./LandingRoute";

function renderLanding(sessionOverride?: Partial<AuthSessionValue>) {
  const sessionValue: AuthSessionValue = {
    user: null,
    csrfToken: null,
    isBootstrapping: false,
    setSession: () => {},
    clearSession: () => {},
    ...sessionOverride,
  };

  return render(
    <AuthSessionContext.Provider value={sessionValue}>
      <MemoryRouter initialEntries={["/life-os"]}>
        <LandingRoute />
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}

describe("LandingRoute", () => {
  it("renders public value proposition, hero title, and signup/login CTA buttons when signed out", () => {
    renderLanding({ user: null });

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /a private place to plan work, focus, and reflect/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();

    const signinButtons = screen.getAllByRole("button", { name: /sign in/i });
    expect(signinButtons.length).toBeGreaterThan(0);

    expect(
      screen.getByRole("heading", { level: 3, name: /plan with clarity/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /deep focus/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /habits & reflection/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /private by design/i }),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute(
      "href",
      "/life-os/terms",
    );
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute(
      "href",
      "/life-os/privacy",
    );
    expect(screen.getByRole("link", { name: /security/i })).toHaveAttribute(
      "href",
      "https://buildwithpartha.tech/.well-known/security.txt",
    );
  });

  it("renders continue CTA to Today when user has an active session", () => {
    renderLanding({
      user: {
        id: "usr-1",
        email: "partha@example.com",
        displayName: "Partha",
        locale: "en-US",
        timeZone: "Asia/Kolkata",
        weekStart: 1,
      },
    });

    const openButtons = screen.getAllByRole("button", { name: /today|open lifeos/i });
    expect(openButtons.length).toBeGreaterThan(0);
  });
});
