package tech.buildwithpartha.lifeos.auth.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/** Request payload to confirm permanent account deletion (LOS-0518). */
@Schema(description = "Confirmation and credentials required to delete an account.")
public record AccountDeletionRequest(
    @Schema(description = "Current account password for re-authentication.")
        @NotBlank(message = "Current password is required") String currentPassword,
    @Schema(description = "Explicit confirmation matching user email or display name.")
        @NotBlank(message = "Confirmation text is required") String confirmationText) {}
