import { describe, expect, it } from "vitest";

import { resolveLoginFieldError } from "./loginFieldErrors";

describe("resolveLoginFieldError", () => {
  it("resolves documented validation failures to approved copy", () => {
    expect(resolveLoginFieldError("email", "NotBlank")).toBe("Enter your email address.");
    expect(resolveLoginFieldError("email", "Email")).toBe(
      "Enter an email address in the format name@example.com.",
    );
    expect(resolveLoginFieldError("email", "Size")).toBe(
      "Enter an email address of 254 characters or fewer.",
    );
    expect(resolveLoginFieldError("password", "NotBlank")).toBe("Enter your password.");
  });

  it("falls back gracefully for an unmapped field or code", () => {
    expect(resolveLoginFieldError("email", "UNKNOWN_CODE")).toBe("Check this value and try again.");
    expect(resolveLoginFieldError("unexpectedField", "NotBlank")).toBe(
      "Check this value and try again.",
    );
  });
});
