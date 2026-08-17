import { describe, expect, it } from "vitest";

import { canGoBackWithinApp } from "./backLinkSafety";

const ORIGIN = "https://app.lifeos.example";

describe("canGoBackWithinApp", () => {
  it("is safe when the referrer is the same origin", () => {
    expect(canGoBackWithinApp(`${ORIGIN}/tasks`, ORIGIN)).toBe(true);
  });

  it("is unsafe when there is no referrer at all — a direct load or bookmark", () => {
    expect(canGoBackWithinApp("", ORIGIN)).toBe(false);
  });

  it("is unsafe when the referrer is a different origin", () => {
    expect(canGoBackWithinApp("https://search.example/results", ORIGIN)).toBe(false);
  });

  it("is unsafe when the referrer is the same host on a different port", () => {
    expect(canGoBackWithinApp("https://app.lifeos.example:8443/tasks", ORIGIN)).toBe(false);
  });

  it("is unsafe rather than throwing when the referrer is not a valid URL", () => {
    expect(canGoBackWithinApp("not a url", ORIGIN)).toBe(false);
  });
});
