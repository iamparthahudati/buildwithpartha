package tech.buildwithpartha.lifeos.auth.api;

import jakarta.validation.constraints.NotBlank;

/** The cancel-deletion request body: the raw token value from the mailed link. */
public record CancelAccountDeletionRequest(@NotBlank String token) {}
