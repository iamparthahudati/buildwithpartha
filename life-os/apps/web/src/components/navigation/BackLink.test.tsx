import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithUser } from "@test/render";

import { BackLink } from "./BackLink";

function setReferrer(referrer: string) {
  Object.defineProperty(document, "referrer", { value: referrer, configurable: true });
}

describe("BackLink", () => {
  afterEach(() => {
    setReferrer("");
    vi.restoreAllMocks();
  });

  it("renders a history button when it arrived from elsewhere in the app", () => {
    setReferrer(`${window.location.origin}/projects`);
    renderWithUser(<BackLink fallbackHref="/tasks" />);

    const control = screen.getByRole("button", { name: "Back" });
    expect(control.tagName).toBe("BUTTON");
  });

  it("calls history.back() when activated with in-app history available", async () => {
    setReferrer(`${window.location.origin}/projects`);
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const { user } = renderWithUser(<BackLink fallbackHref="/tasks" />);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it("renders a real link to the fallback when there is no referrer at all", () => {
    setReferrer("");
    renderWithUser(<BackLink fallbackHref="/tasks" />);

    const link = screen.getByRole("link", { name: "Back" });
    expect(link).toHaveAttribute("href", "/tasks");
  });

  it("renders a real link to the fallback when the referrer is a different origin", () => {
    setReferrer("https://search.example/results");
    renderWithUser(<BackLink fallbackHref="/tasks" />);

    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/tasks");
  });

  it("accepts a caller-supplied label", () => {
    setReferrer("");
    renderWithUser(<BackLink label="Back to Tasks" fallbackHref="/tasks" />);
    expect(screen.getByRole("link", { name: "Back to Tasks" })).toBeInTheDocument();
  });
});
