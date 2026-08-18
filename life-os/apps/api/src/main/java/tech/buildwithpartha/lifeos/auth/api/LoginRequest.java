package tech.buildwithpartha.lifeos.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * The login request body. Password policy is not re-checked here — a stored hash either matches or
 * it does not, and it is not this endpoint's job to say why a wrong password fails to match.
 */
public record LoginRequest(
    @NotBlank @Email @Size(max = 254) String email, @NotBlank String password) {}
