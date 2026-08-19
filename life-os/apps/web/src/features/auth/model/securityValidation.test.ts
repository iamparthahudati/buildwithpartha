import { describe, expect, it } from "vitest";

import { resolveChangePasswordFieldErrors } from "./securityFieldErrors";
import { hasChangePasswordErrors, validateChangePasswordForm } from "./securityValidation";

describe("securityValidation", () => {
  it("validates empty fields", () => {
    const errors = validateChangePasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    expect(errors.currentPassword).toBe("Current password is required.");
    expect(errors.newPassword).toBe("New password is required.");
    expect(errors.confirmPassword).toBe("Please confirm your new password.");
    expect(hasChangePasswordErrors(errors)).toBe(true);
  });

  it("enforces minimum and maximum password length", () => {
    const shortErrors = validateChangePasswordForm({
      currentPassword: "OldPassword123!",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(shortErrors.newPassword).toBe("New password must be at least 8 characters long.");

    const longErrors = validateChangePasswordForm({
      currentPassword: "OldPassword123!",
      newPassword: "a".repeat(129),
      confirmPassword: "a".repeat(129),
    });
    expect(longErrors.newPassword).toBe("New password cannot exceed 128 characters.");
  });

  it("requires new password to be different from current password", () => {
    const errors = validateChangePasswordForm({
      currentPassword: "SamePassword123!",
      newPassword: "SamePassword123!",
      confirmPassword: "SamePassword123!",
    });
    expect(errors.newPassword).toBe("New password must be different from current password.");
  });

  it("checks password confirmation match", () => {
    const errors = validateChangePasswordForm({
      currentPassword: "OldPassword123!",
      newPassword: "NewSecretPassword123!",
      confirmPassword: "DifferentPassword123!",
    });
    expect(errors.confirmPassword).toBe("Passwords do not match.");
  });

  it("passes when all fields are valid", () => {
    const errors = validateChangePasswordForm({
      currentPassword: "OldPassword123!",
      newPassword: "NewSecretPassword123!",
      confirmPassword: "NewSecretPassword123!",
    });
    expect(hasChangePasswordErrors(errors)).toBe(false);
  });
});

describe("securityFieldErrors", () => {
  it("maps ProblemDetails server errors", () => {
    const serverError = {
      problem: {
        type: "https://buildwithpartha.tech/life-os/problems/v1/validation-failed",
        title: "Validation failed",
        status: 400,
        detail: "One or more fields are invalid.",
        instance: "/life-os/api/v1/auth/change-password",
        code: "VALIDATION_FAILED",
        correlationId: "abc",
        errors: [
          { field: "currentPassword", code: "INVALID_CURRENT_PASSWORD" },
          { field: "newPassword", code: "COMMONLY_EXPOSED" },
        ],
      },
    };

    const errors = resolveChangePasswordFieldErrors(serverError);
    expect(errors.currentPassword).toBe("The current password you entered is incorrect.");
    expect(errors.newPassword).toBe(
      "This password is too common or easily guessed. Please choose a stronger password.",
    );
  });

  it("returns empty object on non-problem errors", () => {
    expect(resolveChangePasswordFieldErrors(null)).toEqual({});
    expect(resolveChangePasswordFieldErrors(new Error("network error"))).toEqual({});
  });
});
