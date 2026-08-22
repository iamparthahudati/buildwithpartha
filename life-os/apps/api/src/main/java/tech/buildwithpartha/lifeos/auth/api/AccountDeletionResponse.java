package tech.buildwithpartha.lifeos.auth.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Response returned upon successfully requesting account deletion (LOS-0518). The account enters a
 * cancellable 30-day grace period; it is not deleted yet.
 */
@Schema(description = "Account deletion request acknowledgment.")
public record AccountDeletionResponse(
    @Schema(description = "Lifecycle status, e.g. GRACE_PERIOD.") String status,
    @Schema(description = "Human-readable status summary.") String message,
    @Schema(description = "Canonical UTC timestamp of the deletion request.") Instant requestedAt,
    @Schema(description = "The account is purged if not cancelled by this instant.")
        Instant scheduledPurgeAt) {}
