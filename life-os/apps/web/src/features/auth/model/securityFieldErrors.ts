import type { ApiProblem } from "@lib/apiClient";
import { groupFieldProblems } from "@lib/serverErrors";

import type { ChangePasswordErrors } from "./securityValidation";

export function resolveChangePasswordFieldErrors(error: unknown): ChangePasswordErrors {
  if (!error || typeof error !== "object" || !("problem" in error)) {
    return {};
  }
  const problem = (error as { problem?: ApiProblem }).problem;
  const grouped = groupFieldProblems(problem?.errors);
  const errors: Record<string, string> = {};

  if (grouped.currentPassword) {
    errors.currentPassword = mapCurrentPasswordProblem(grouped.currentPassword);
  }
  if (grouped.newPassword) {
    errors.newPassword = mapNewPasswordProblem(grouped.newPassword);
  }

  return errors;
}

function mapCurrentPasswordProblem(code: string): string {
  switch (code) {
    case "INVALID_CURRENT_PASSWORD":
      return "The current password you entered is incorrect.";
    case "NotBlank":
    case "REQUIRED":
      return "Current password is required.";
    default:
      return "Please check your current password.";
  }
}

function mapNewPasswordProblem(code: string): string {
  switch (code) {
    case "TOO_SHORT":
      return "Password must be at least 8 characters long.";
    case "TOO_LONG":
      return "Password cannot exceed 128 characters.";
    case "COMMONLY_EXPOSED":
      return "This password is too common or easily guessed. Please choose a stronger password.";
    case "NotBlank":
    case "REQUIRED":
      return "New password is required.";
    default:
      return "Please choose a password meeting security requirements.";
  }
}
