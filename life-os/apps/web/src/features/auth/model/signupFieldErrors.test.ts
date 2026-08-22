import { describe, expect, it } from "vitest";

import { resolveSignupFieldError } from "./signupFieldErrors";

describe("resolveSignupFieldError", () => {
  it("resolves every documented backend code to approved copy", () => {
    expect(resolveSignupFieldError("email", "NotBlank")).toBe("Enter your email address.");
    expect(resolveSignupFieldError("email", "Email")).toBe(
      "Enter an email address in the format name@example.com.",
    );
    expect(resolveSignupFieldError("password", "TOO_SHORT")).toBe("Use at least 12 characters.");
    expect(resolveSignupFieldError("password", "TOO_LONG")).toBe("Use 128 characters or fewer.");
    expect(resolveSignupFieldError("password", "COMMONLY_EXPOSED")).toContain("data breaches");
    expect(resolveSignupFieldError("displayName", "NotBlank")).toBe("Enter your name.");
  });

  it("falls back to a generic message for an unmapped field/code pair", () => {
    expect(resolveSignupFieldError("termsVersion", "NotBlank")).toBe(
      "Check this value and try again.",
    );
    expect(resolveSignupFieldError("email", "SomeFutureCode")).toBe(
      "Check this value and try again.",
    );
  });
});
