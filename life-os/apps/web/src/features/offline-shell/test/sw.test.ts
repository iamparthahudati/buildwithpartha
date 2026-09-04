import { describe, expect, it } from "vitest";

describe("Service Worker logic & rules (LOS-1315)", () => {
  function isApiRequest(url: URL): boolean {
    return url.pathname.includes("/api/");
  }

  function isNavigationRequest(mode: string, acceptHeader?: string): boolean {
    return mode === "navigate" || Boolean(acceptHeader?.includes("text/html"));
  }

  it("identifies API requests matching /api/ path", () => {
    expect(isApiRequest(new URL("https://buildwithpartha.tech/life-os/api/v1/tasks"))).toBe(true);
    expect(isApiRequest(new URL("https://buildwithpartha.tech/life-os/api/v1/auth/session"))).toBe(
      true,
    );
    expect(isApiRequest(new URL("https://buildwithpartha.tech/life-os/assets/index.js"))).toBe(
      false,
    );
  });

  it("identifies navigation requests", () => {
    expect(isNavigationRequest("navigate")).toBe(true);
    expect(isNavigationRequest("cors", "text/html,application/xhtml+xml")).toBe(true);
    expect(isNavigationRequest("cors", "application/json")).toBe(false);
  });
});
