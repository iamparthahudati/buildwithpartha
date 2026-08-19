import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { UnavailableRoute } from "./UnavailableRoute";

describe("UnavailableRoute", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the unavailable message with a Try again action", () => {
    renderWithUser(<UnavailableRoute />);

    expect(screen.getByText("LifeOS is temporarily unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("reloads the page when Try again is activated", async () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadSpy });

    const { user } = renderWithUser(<UnavailableRoute />);
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(<UnavailableRoute />);
    await expectNoAccessibilityViolations(container);
  });
});
