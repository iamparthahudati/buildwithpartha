package tech.buildwithpartha.lifeos.attachment.api;

import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentStatus;

/** API response record for attachment metadata (ADR-015). */
public record AttachmentResponse(
    UUID id,
    AttachmentEntityType entityType,
    UUID entityId,
    String fileName,
    String sanitizedFileName,
    String contentType,
    long fileSizeBytes,
    AttachmentStatus status,
    String scanResult,
    Instant createdAt,
    Instant updatedAt) {

  public static AttachmentResponse from(Attachment attachment) {
    return new AttachmentResponse(
        attachment.getId(),
        attachment.getEntityType(),
        attachment.getEntityId(),
        attachment.getFileName(),
        attachment.getSanitizedFileName(),
        attachment.getContentType(),
        attachment.getFileSizeBytes(),
        attachment.getStatus(),
        attachment.getScanResult(),
        attachment.getCreatedAt(),
        attachment.getUpdatedAt());
  }
}
