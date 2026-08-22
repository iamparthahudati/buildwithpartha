import { describe, expect, it } from "vitest";

import { resolveResetPasswordFieldError } from "./resetPasswordFieldErrors";

describe("resolveResetPasswordFieldError", () => {
  it("resolves newPassword field errors", () => {
    expect(resolveResetPasswordFieldError("newPassword", "NotBlank")).toBe("Enter a new password.");
    expect(resolveResetPasswordFieldError("newPassword", "TOO_SHORT")).toBe(
      "Use at least 12 characters.",
    );
    expect(resolveResetPasswordFieldError("newPassword", "TOO_LONG")).toBe(
      "Use 128 characters or fewer.",
    );
    expect(resolveResetPasswordFieldError("newPassword", "COMMONLY_EXPOSED")).toBe(
      "This password appears in known data breaches. Choose a different one.",
    );
  });

  it("resolves confirmPassword field errors", () => {
    expect(resolveResetPasswordFieldError("confirmPassword", "NotBlank")).toBe(
      "Confirm your new password.",
    );
    expect(resolveResetPasswordFieldError("confirmPassword", "MISMATCH")).toBe(
      "Passwords do not match.",
    );
  });

  it("falls back to generic error copy on unknown field or code", () => {
    expect(resolveResetPasswordFieldError("newPassword", "UnknownCode")).toBe(
      "Check this value and try again.",
    );
    expect(resolveResetPasswordFieldError("unknownField", "NotBlank")).toBe(
      "Check this value and try again.",
    );
  });
});
