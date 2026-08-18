package tech.buildwithpartha.lifeos.auth.api;

import jakarta.validation.constraints.NotBlank;

/**
 * The reset-password request body. Password length/common-exposure policy is checked in {@code
 * auth.application.ResetPasswordService}, not here, matching {@code SignupRequest}'s own split.
 */
public record ResetPasswordRequest(@NotBlank String token, @NotBlank String newPassword) {}
