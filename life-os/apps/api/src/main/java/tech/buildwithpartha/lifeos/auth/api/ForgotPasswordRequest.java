package tech.buildwithpartha.lifeos.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The forgot-password request body: just the email, matching {@code SignupRequest}'s field. */
public record ForgotPasswordRequest(@NotBlank @Email @Size(max = 254) String email) {}
