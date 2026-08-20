package tech.buildwithpartha.lifeos.common.export;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Cross-domain read model representing an export file record. */
public record ExportSummary(
    UUID id,
    String fileName,
    Optional<Long> fileSizeBytes,
    String status,
    Instant expiresAt,
    Optional<Instant> downloadedAt,
    Instant createdAt) {}
