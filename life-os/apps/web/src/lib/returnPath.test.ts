import { describe, expect, it } from "vitest";

import {
  buildLoginPathWithReturnTo,
  currentPathForReturnTo,
  defaultAuthenticatedPath,
  isSafeReturnPath,
  loginPath,
  resolveReturnTarget,
} from "./returnPath";

// A literal bell character, built from an escape rather than typed directly
// so the test source stays plain ASCII.
const CONTROL_CHARACTER = String.fromCharCode(7);

describe("loginPath and defaultAuthenticatedPath", () => {
  it("builds canonical paths under the app base path", () => {
    expect(loginPath()).toBe("/life-os/login");
    expect(defaultAuthenticatedPath()).toBe("/life-os/app/today");
  });
});

describe("isSafeReturnPath", () => {
  it.each([
    "/life-os",
    "/life-os/app/today",
    "/life-os/app/tasks?status=open",
    "/life-os/app/tasks/123#comments",
  ])("accepts %s as a same-origin path inside the app", (candidate) => {
    expect(isSafeReturnPath(candidate)).toBe(true);
  });

  it.each<[string | null | undefined, string]>([
    [null, "null"],
    [undefined, "undefined"],
    ["", "an empty string"],
    ["life-os/app/today", "a path missing its leading slash"],
    ["//evil.example/phish", "a protocol-relative host"],
    ["/\\evil.example", "a backslash-led protocol-relative host"],
    ["https://evil.example/phish", "an absolute URL"],
    [`/life-os/app${CONTROL_CHARACTER}/today`, "an embedded control character"],
    ["/other-app/settings", "a path outside the LifeOS app base path"],
    ["/life-os-imposter/app/today", "a path merely prefixed by the app segment"],
  ])("rejects a case of %#: %s", (candidate) => {
    expect(isSafeReturnPath(candidate)).toBe(false);
  });
});

describe("buildLoginPathWithReturnTo", () => {
  it("appends an encoded returnTo for a safe path", () => {
    expect(buildLoginPathWithReturnTo("/life-os/app/tasks?status=open")).toBe(
      "/life-os/login?returnTo=%2Flife-os%2Fapp%2Ftasks%3Fstatus%3Dopen",
    );
  });

  it("omits returnTo entirely for an unsafe or missing value", () => {
    expect(buildLoginPathWithReturnTo("https://evil.example")).toBe("/life-os/login");
    expect(buildLoginPathWithReturnTo(null)).toBe("/life-os/login");
    expect(buildLoginPathWithReturnTo(undefined)).toBe("/life-os/login");
  });
});

describe("resolveReturnTarget", () => {
  it("decodes and returns a valid encoded returnTo", () => {
    expect(resolveReturnTarget("%2Flife-os%2Fapp%2Ftasks")).toBe("/life-os/app/tasks");
  });

  it("falls back to Today for a missing value", () => {
    expect(resolveReturnTarget(null)).toBe("/life-os/app/today");
    expect(resolveReturnTarget(undefined)).toBe("/life-os/app/today");
  });

  it("falls back to Today for an unsafe value rather than an open redirect", () => {
    expect(resolveReturnTarget(encodeURIComponent("https://evil.example"))).toBe(
      "/life-os/app/today",
    );
  });

  it("falls back to Today rather than redirecting back to the login page itself", () => {
    expect(resolveReturnTarget(encodeURIComponent("/life-os/login"))).toBe("/life-os/app/today");
  });

  it("falls back to Today for a value that cannot be decoded", () => {
    expect(resolveReturnTarget("%")).toBe("/life-os/app/today");
  });
});

describe("currentPathForReturnTo", () => {
  it("captures the current path, query and hash", () => {
    window.history.pushState({}, "", "/life-os/app/tasks?status=open#top");
    expect(currentPathForReturnTo()).toBe("/life-os/app/tasks?status=open#top");
    window.history.pushState({}, "", "/");
  });
});
