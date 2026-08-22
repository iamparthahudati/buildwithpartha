import { describe, expect, it } from "vitest";

import { validateForgotPasswordForm } from "./forgotPasswordValidation";

describe("validateForgotPasswordForm", () => {
  it("passes for a valid email", () => {
    const errors = validateForgotPasswordForm({ email: "user@example.test" });
    expect(errors).toEqual({});
  });

  it("fails when email is empty or whitespace", () => {
    const errors = validateForgotPasswordForm({ email: "   " });
    expect(errors.email).toBe("Enter your email address.");
  });

  it("fails when email exceeds 254 chars", () => {
    const longEmail = `${"a".repeat(250)}@example.com`;
    const errors = validateForgotPasswordForm({ email: longEmail });
    expect(errors.email).toBe("Enter an email address of 254 characters or fewer.");
  });

  it("fails when email has invalid shape", () => {
    const errors = validateForgotPasswordForm({ email: "not-an-email" });
    expect(errors.email).toBe("Enter an email address in the format name@example.com.");
  });
});
