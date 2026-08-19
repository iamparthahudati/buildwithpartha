package tech.buildwithpartha.lifeos.export.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;
import tech.buildwithpartha.lifeos.export.domain.ExportFileStatus;

/**
 * JPA entity mapping for {@code public.export_files} ({@code V6__export_files_schema.sql}).
 */
@Entity
@Table(name = "export_files", schema = "public")
class ExportFileEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "job_id")
  private UUID jobId;

  @Enumerated(EnumType.STRING)
  @Column(name = "export_kind", nullable = false, updatable = false)
  private ExportFileKind exportKind;

  @Column(name = "file_name", nullable = false)
  private String fileName;

  @Column(name = "file_size_bytes")
  private Long fileSizeBytes;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private ExportFileStatus status;

  @Column(name = "download_token_hash")
  private String downloadTokenHash;

  @Column(name = "download_token_expires_at")
  private Instant downloadTokenExpiresAt;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "downloaded_at")
  private Instant downloadedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected ExportFileEntity() {}

  ExportFileEntity(
      UUID id,
      UUID userId,
      UUID jobId,
      ExportFileKind exportKind,
      String fileName,
      Long fileSizeBytes,
      ExportFileStatus status,
      String downloadTokenHash,
      Instant downloadTokenExpiresAt,
      Instant expiresAt,
      Instant downloadedAt,
      Instant createdAt,
      Instant updatedAt) {
    this.id = id;
    this.userId = userId;
    this.jobId = jobId;
    this.exportKind = exportKind;
    this.fileName = fileName;
    this.fileSizeBytes = fileSizeBytes;
    this.status = status;
    this.downloadTokenHash = downloadTokenHash;
    this.downloadTokenExpiresAt = downloadTokenExpiresAt;
    this.expiresAt = expiresAt;
    this.downloadedAt = downloadedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  UUID getJobId() {
    return jobId;
  }

  ExportFileKind getExportKind() {
    return exportKind;
  }

  String getFileName() {
    return fileName;
  }

  Long getFileSizeBytes() {
    return fileSizeBytes;
  }

  ExportFileStatus getStatus() {
    return status;
  }

  String getDownloadTokenHash() {
    return downloadTokenHash;
  }

  Instant getDownloadTokenExpiresAt() {
    return downloadTokenExpiresAt;
  }

  Instant getExpiresAt() {
    return expiresAt;
  }

  Instant getDownloadedAt() {
    return downloadedAt;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getUpdatedAt() {
    return updatedAt;
  }
}
