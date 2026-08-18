package tech.buildwithpartha.lifeos.auth.api;

import jakarta.validation.constraints.NotBlank;

/** The email verification request body: the raw token value from the mailed link. */
public record VerifyEmailRequest(@NotBlank String token) {}
