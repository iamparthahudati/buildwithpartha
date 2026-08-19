export interface ChangePasswordFormData {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
}

export type ChangePasswordField = "currentPassword" | "newPassword" | "confirmPassword";

export type ChangePasswordErrors = Partial<Record<ChangePasswordField, string>>;

export function validateChangePasswordForm(data: ChangePasswordFormData): ChangePasswordErrors {
  const errors: ChangePasswordErrors = {};

  if (!data.currentPassword.trim()) {
    errors.currentPassword = "Current password is required.";
  }

  if (!data.newPassword) {
    errors.newPassword = "New password is required.";
  } else if (data.newPassword.length < 8) {
    errors.newPassword = "New password must be at least 8 characters long.";
  } else if (data.newPassword.length > 128) {
    errors.newPassword = "New password cannot exceed 128 characters.";
  } else if (data.currentPassword && data.newPassword === data.currentPassword) {
    errors.newPassword = "New password must be different from current password.";
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = "Please confirm your new password.";
  } else if (data.newPassword && data.confirmPassword !== data.newPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function hasChangePasswordErrors(errors: ChangePasswordErrors): boolean {
  return Object.values(errors).some((err) => Boolean(err));
}
