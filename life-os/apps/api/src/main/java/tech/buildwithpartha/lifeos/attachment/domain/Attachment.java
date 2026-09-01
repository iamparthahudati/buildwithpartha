package tech.buildwithpartha.lifeos.attachment.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Domain aggregate representing attachment file metadata and scanning lifecycle. */
public final class Attachment {

  private final UUID id;
  private final UUID userId;
  private final AttachmentEntityType entityType;
  private final UUID entityId;
  private final String fileName;
  private final String sanitizedFileName;
  private final String contentType;
  private final long fileSizeBytes;
  private final String storageKey;
  private AttachmentStatus status;
  private String scanResult;
  private final Instant createdAt;
  private Instant updatedAt;
  private Instant deletedAt;

  public Attachment(
      UUID id,
      UUID userId,
      AttachmentEntityType entityType,
      UUID entityId,
      String fileName,
      String sanitizedFileName,
      String contentType,
      long fileSizeBytes,
      String storageKey,
      AttachmentStatus status,
      String scanResult,
      Instant createdAt,
      Instant updatedAt,
      Instant deletedAt) {
    this.id = Objects.requireNonNull(id, "id must not be null");
    this.userId = Objects.requireNonNull(userId, "userId must not be null");
    this.entityType = Objects.requireNonNull(entityType, "entityType must not be null");
    this.entityId = Objects.requireNonNull(entityId, "entityId must not be null");
    this.fileName = Objects.requireNonNull(fileName, "fileName must not be null");
    this.sanitizedFileName =
        Objects.requireNonNull(sanitizedFileName, "sanitizedFileName must not be null");
    this.contentType = Objects.requireNonNull(contentType, "contentType must not be null");
    this.fileSizeBytes = fileSizeBytes;
    this.storageKey = Objects.requireNonNull(storageKey, "storageKey must not be null");
    this.status = Objects.requireNonNull(status, "status must not be null");
    this.scanResult = scanResult;
    this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
    this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    this.deletedAt = deletedAt;
  }

  public static Attachment createPending(
      UUID id,
      UUID userId,
      AttachmentEntityType entityType,
      UUID entityId,
      String fileName,
      String sanitizedFileName,
      String contentType,
      long fileSizeBytes,
      String storageKey,
      Instant now) {
    return new Attachment(
        id,
        userId,
        entityType,
        entityId,
        fileName,
        sanitizedFileName,
        contentType,
        fileSizeBytes,
        storageKey,
        AttachmentStatus.PENDING_SCAN,
        null,
        now,
        now,
        null);
  }

  public void markClean(Instant now) {
    this.status = AttachmentStatus.CLEAN;
    this.scanResult = "CLEAN";
    this.updatedAt = Objects.requireNonNull(now, "now must not be null");
  }

  public void markQuarantined(String scanResult, Instant now) {
    this.status = AttachmentStatus.QUARANTINED;
    this.scanResult = scanResult;
    this.updatedAt = Objects.requireNonNull(now, "now must not be null");
  }

  public void markDeleted(Instant now) {
    this.status = AttachmentStatus.DELETED;
    this.deletedAt = Objects.requireNonNull(now, "now must not be null");
    this.updatedAt = now;
  }

  public UUID getId() {
    return id;
  }

  public UUID getUserId() {
    return userId;
  }

  public AttachmentEntityType getEntityType() {
    return entityType;
  }

  public UUID getEntityId() {
    return entityId;
  }

  public String getFileName() {
    return fileName;
  }

  public String getSanitizedFileName() {
    return sanitizedFileName;
  }

  public String getContentType() {
    return contentType;
  }

  public long getFileSizeBytes() {
    return fileSizeBytes;
  }

  public String getStorageKey() {
    return storageKey;
  }

  public AttachmentStatus getStatus() {
    return status;
  }

  public String getScanResult() {
    return scanResult;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public Instant getDeletedAt() {
    return deletedAt;
  }
}
