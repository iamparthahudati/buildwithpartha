package tech.buildwithpartha.lifeos.attachment.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentStatus;

/** JPA entity mapping public.attachments table (ADR-015). */
@Entity
@Table(name = "attachments", schema = "public")
public class AttachmentEntity {

  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "entity_type", nullable = false)
  private AttachmentEntityType entityType;

  @Column(name = "entity_id", nullable = false)
  private UUID entityId;

  @Column(name = "file_name", nullable = false)
  private String fileName;

  @Column(name = "sanitized_file_name", nullable = false)
  private String sanitizedFileName;

  @Column(name = "content_type", nullable = false)
  private String contentType;

  @Column(name = "file_size_bytes", nullable = false)
  private long fileSizeBytes;

  @Column(name = "storage_key", nullable = false)
  private String storageKey;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private AttachmentStatus status;

  @Column(name = "scan_result")
  private String scanResult;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  protected AttachmentEntity() {}

  public AttachmentEntity(
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
    this.id = id;
    this.userId = userId;
    this.entityType = entityType;
    this.entityId = entityId;
    this.fileName = fileName;
    this.sanitizedFileName = sanitizedFileName;
    this.contentType = contentType;
    this.fileSizeBytes = fileSizeBytes;
    this.storageKey = storageKey;
    this.status = status;
    this.scanResult = scanResult;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.deletedAt = deletedAt;
  }

  public static AttachmentEntity fromDomain(Attachment attachment) {
    return new AttachmentEntity(
        attachment.getId(),
        attachment.getUserId(),
        attachment.getEntityType(),
        attachment.getEntityId(),
        attachment.getFileName(),
        attachment.getSanitizedFileName(),
        attachment.getContentType(),
        attachment.getFileSizeBytes(),
        attachment.getStorageKey(),
        attachment.getStatus(),
        attachment.getScanResult(),
        attachment.getCreatedAt(),
        attachment.getUpdatedAt(),
        attachment.getDeletedAt());
  }

  public Attachment toDomain() {
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
        status,
        scanResult,
        createdAt,
        updatedAt,
        deletedAt);
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
