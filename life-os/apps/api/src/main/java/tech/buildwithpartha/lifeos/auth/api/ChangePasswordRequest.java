package tech.buildwithpartha.lifeos.auth.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
    @NotBlank(message = "REQUIRED") String currentPassword,
    @NotBlank(message = "REQUIRED") @Size(max = 128, message = "TOO_LONG") String newPassword) {}
