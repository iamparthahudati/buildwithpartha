import { describe, expect, it } from "vitest";

import { validatePublicEnvironment } from "./environment";

const validEnvironment = {
  VITE_APP_BASE_PATH: "/life-os/",
  VITE_API_BASE_PATH: "/life-os/api/v1",
};

describe("validatePublicEnvironment", () => {
  it("returns trimmed public configuration", () => {
    expect(
      validatePublicEnvironment({
        VITE_APP_BASE_PATH: " /life-os/ ",
        VITE_API_BASE_PATH: " /life-os/api/v1 ",
      }),
    ).toEqual({
      appBasePath: "/life-os/",
      apiBasePath: "/life-os/api/v1",
    });
  });

  it("names every missing or blank key", () => {
    expect(() =>
      validatePublicEnvironment({ VITE_APP_BASE_PATH: "", VITE_API_BASE_PATH: undefined }),
    ).toThrowError(
      "LifeOS frontend environment validation failed; missing keys: " +
        "VITE_APP_BASE_PATH, VITE_API_BASE_PATH",
    );
  });

  it.each([
    [{ ...validEnvironment, VITE_APP_BASE_PATH: "life-os/" }, "VITE_APP_BASE_PATH"],
    [{ ...validEnvironment, VITE_APP_BASE_PATH: "/life-os" }, "VITE_APP_BASE_PATH"],
    [{ ...validEnvironment, VITE_API_BASE_PATH: "/other/api/v1" }, "VITE_API_BASE_PATH"],
    [{ ...validEnvironment, VITE_API_BASE_PATH: "/life-os/api/v1/" }, "VITE_API_BASE_PATH"],
  ])("rejects invalid public paths without exposing their values", (source, key) => {
    expect(() => validatePublicEnvironment(source)).toThrowError(
      `LifeOS frontend environment validation failed; invalid keys: ${key}`,
    );
  });
});
