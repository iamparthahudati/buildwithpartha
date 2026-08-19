import { describe, expect, it } from "vitest";

import { validateResetPasswordForm } from "./resetPasswordValidation";

describe("validateResetPasswordForm", () => {
  it("passes when newPassword is valid and matches confirmPassword", () => {
    const errors = validateResetPasswordForm({
      newPassword: "correct-horse-battery-staple",
      confirmPassword: "correct-horse-battery-staple",
    });
    expect(errors).toEqual({});
  });

  it("fails when newPassword is empty", () => {
    const errors = validateResetPasswordForm({
      newPassword: "",
      confirmPassword: "",
    });
    expect(errors.newPassword).toBe("Enter a new password.");
    expect(errors.confirmPassword).toBe("Confirm your new password.");
  });

  it("fails when newPassword is too short", () => {
    const errors = validateResetPasswordForm({
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(errors.newPassword).toBe("Use at least 12 characters.");
  });

  it("fails when newPassword is too long", () => {
    const errors = validateResetPasswordForm({
      newPassword: "a".repeat(129),
      confirmPassword: "a".repeat(129),
    });
    expect(errors.newPassword).toBe("Use 128 characters or fewer.");
  });

  it("fails when confirmPassword does not match newPassword", () => {
    const errors = validateResetPasswordForm({
      newPassword: "correct-horse-battery-staple",
      confirmPassword: "different-password-value",
    });
    expect(errors.confirmPassword).toBe("Passwords do not match.");
  });
});
