package tech.buildwithpartha.lifeos.export.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.export.ExportSummary;

/** Single export file summary response item. */
@Schema(description = "Export archive metadata and availability status.")
public record ExportItemResponse(
    @Schema(description = "Export record identifier.") UUID id,
    @Schema(description = "File archive name.") String fileName,
    @Schema(description = "File size in bytes, or null if still generating.") Long fileSizeBytes,
    @Schema(description = "GENERATING | READY | EXPIRED | DELETED.") String status,
    @Schema(description = "Expiry timestamp after which file is purged.") Instant expiresAt,
    @Schema(description = "Timestamp of first download, if downloaded.") Instant downloadedAt,
    @Schema(description = "Creation timestamp.") Instant createdAt) {

  public static ExportItemResponse from(ExportSummary summary) {
    return new ExportItemResponse(
        summary.id(),
        summary.fileName(),
        summary.fileSizeBytes().orElse(null),
        summary.status(),
        summary.expiresAt(),
        summary.downloadedAt().orElse(null),
        summary.createdAt());
  }
}
