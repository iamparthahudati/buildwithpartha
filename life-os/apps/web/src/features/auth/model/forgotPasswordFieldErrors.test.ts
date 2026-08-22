import { describe, expect, it } from "vitest";

import { resolveForgotPasswordFieldError } from "./forgotPasswordFieldErrors";

describe("resolveForgotPasswordFieldError", () => {
  it("resolves email NotBlank, Email, and Size", () => {
    expect(resolveForgotPasswordFieldError("email", "NotBlank")).toBe("Enter your email address.");
    expect(resolveForgotPasswordFieldError("email", "Email")).toBe(
      "Enter an email address in the format name@example.com.",
    );
    expect(resolveForgotPasswordFieldError("email", "Size")).toBe(
      "Enter an email address of 254 characters or fewer.",
    );
  });

  it("falls back to generic error copy on unknown field or code", () => {
    expect(resolveForgotPasswordFieldError("email", "UnknownCode")).toBe(
      "Check this value and try again.",
    );
    expect(resolveForgotPasswordFieldError("unknownField", "NotBlank")).toBe(
      "Check this value and try again.",
    );
  });
});
