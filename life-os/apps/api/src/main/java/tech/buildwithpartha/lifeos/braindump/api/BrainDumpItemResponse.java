package tech.buildwithpartha.lifeos.braindump.api;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItem;

/** Response DTO representing a Brain Dump Item. */
public record BrainDumpItemResponse(
    UUID id,
    UUID userId,
    String content,
    String status,
    Optional<String> convertedToType,
    Optional<UUID> convertedToId,
    Optional<Instant> convertedAt,
    Optional<Instant> archivedAt,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static BrainDumpItemResponse fromDomain(BrainDumpItem domain) {
    Objects.requireNonNull(domain, "domain must not be null");
    return new BrainDumpItemResponse(
        domain.id(),
        domain.userId(),
        domain.content(),
        domain.status().name(),
        domain.convertedToType(),
        domain.convertedToId(),
        domain.convertedAt(),
        domain.archivedAt(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }
}
