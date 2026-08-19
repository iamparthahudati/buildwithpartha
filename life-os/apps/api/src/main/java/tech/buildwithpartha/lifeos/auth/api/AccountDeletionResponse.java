package tech.buildwithpartha.lifeos.auth.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Response returned upon successful account deletion request.
 */
@Schema(description = "Account deletion acknowledgment.")
public record AccountDeletionResponse(
    @Schema(description = "Lifecycle status, e.g. DELETED.") String status,
    @Schema(description = "Human-readable status summary.") String message,
    @Schema(description = "Canonical UTC timestamp of the deletion request.")
        Instant requestedAt) {}
