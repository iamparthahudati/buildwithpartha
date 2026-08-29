import { describe, expect, it } from "vitest";

import { resolveRouteTitle } from "./navigationDestinations";

describe("resolveRouteTitle", () => {
  it("resolves a sidebar destination's exact path to its label", () => {
    expect(resolveRouteTitle("/life-os/app/tasks")).toBe("Tasks");
  });

  it("resolves a nested detail path to its parent destination's label", () => {
    expect(resolveRouteTitle("/life-os/app/tasks/123")).toBe("Tasks");
  });

  it("resolves the default app path to Today", () => {
    expect(resolveRouteTitle("/life-os/app")).toBe("Today");
  });

  it("resolves non-sidebar destinations (Settings, Search, Notifications, Onboarding)", () => {
    expect(resolveRouteTitle("/life-os/app/settings")).toBe("Settings");
    expect(resolveRouteTitle("/life-os/app/settings/security")).toBe("Settings");
    expect(resolveRouteTitle("/life-os/app/search")).toBe("Search");
    expect(resolveRouteTitle("/life-os/app/notifications")).toBe("Notifications");
    expect(resolveRouteTitle("/life-os/app/focus")).toBe("Focus Mode");
    expect(resolveRouteTitle("/life-os/app/onboarding")).toBe("Onboarding");
  });

  it("falls back to LifeOS for an unmatched path", () => {
    expect(resolveRouteTitle("/life-os/app/not-a-real-route")).toBe("LifeOS");
  });
});
