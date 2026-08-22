package tech.buildwithpartha.lifeos.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * The signup request body. Password length and common-exposure policy are checked in {@code
 * auth.application.SignupService}, not here, so both violations report through the same {@code
 * auth.domain.PasswordPolicyViolation} codes regardless of which layer catches them.
 *
 * <p>{@code termsVersion}/{@code privacyVersion} are separate fields, not one combined value:
 * {@code 31-PRIVACY-DATA-LIFECYCLE.md} requires terms acceptance and privacy notice acknowledgment
 * to stay separate consent records rather than one bundled checkbox.
 */
public record SignupRequest(
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank String password,
    @NotBlank @Size(max = 100) String displayName,
    @NotBlank @Size(max = 100) String termsVersion,
    @NotBlank @Size(max = 100) String privacyVersion) {}
