package tech.buildwithpartha.lifeos.export.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;

/**
 * Immutable domain aggregate representing a private generated export file (LOS-1405).
 *
 * <p>Access to physical storage is controlled via time-limited cryptographic download tokens whose
 * SHA-256 hashes are verified before streaming.
 */
public record ExportFile(
    UUID id,
    UUID userId,
    Optional<UUID> jobId,
    ExportFileKind exportKind,
    String fileName,
    Optional<Long> fileSizeBytes,
    ExportFileStatus status,
    Optional<String> downloadTokenHash,
    Optional<Instant> downloadTokenExpiresAt,
    Instant expiresAt,
    Optional<Instant> downloadedAt,
    Instant createdAt,
    Instant updatedAt) {

  public ExportFile {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(jobId, "jobId must not be null");
    Objects.requireNonNull(exportKind, "exportKind must not be null");
    Objects.requireNonNull(fileName, "fileName must not be null");
    Objects.requireNonNull(fileSizeBytes, "fileSizeBytes must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(downloadTokenHash, "downloadTokenHash must not be null");
    Objects.requireNonNull(downloadTokenExpiresAt, "downloadTokenExpiresAt must not be null");
    Objects.requireNonNull(expiresAt, "expiresAt must not be null");
    Objects.requireNonNull(downloadedAt, "downloadedAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    fileSizeBytes.ifPresent(
        size -> {
          if (size < 0) {
            throw new IllegalArgumentException("fileSizeBytes cannot be negative");
          }
        });
  }

  /** Factory for creating a newly initiated export in GENERATING status. */
  public static ExportFile createGenerating(
      UUID id,
      UUID userId,
      Optional<UUID> jobId,
      ExportFileKind kind,
      String fileName,
      Instant expiresAt,
      Instant now) {
    return new ExportFile(
        id,
        userId,
        jobId,
        kind,
        fileName,
        Optional.empty(),
        ExportFileStatus.GENERATING,
        Optional.empty(),
        Optional.empty(),
        expiresAt,
        Optional.empty(),
        now,
        now);
  }

  /** Marks the export READY with its completed size and initial download token hash. */
  public ExportFile markReady(
      long sizeBytes, String tokenHash, Instant tokenExpiresAt, Instant now) {
    Objects.requireNonNull(tokenHash, "tokenHash must not be null");
    Objects.requireNonNull(tokenExpiresAt, "tokenExpiresAt must not be null");
    Objects.requireNonNull(now, "now must not be null");
    return new ExportFile(
        id,
        userId,
        jobId,
        exportKind,
        fileName,
        Optional.of(sizeBytes),
        ExportFileStatus.READY,
        Optional.of(tokenHash),
        Optional.of(tokenExpiresAt),
        expiresAt,
        downloadedAt,
        createdAt,
        now);
  }

  /** Replaces the download token with a newly issued token hash. */
  public ExportFile withNewDownloadToken(String tokenHash, Instant tokenExpiresAt, Instant now) {
    Objects.requireNonNull(tokenHash, "tokenHash must not be null");
    Objects.requireNonNull(tokenExpiresAt, "tokenExpiresAt must not be null");
    Objects.requireNonNull(now, "now must not be null");
    return new ExportFile(
        id,
        userId,
        jobId,
        exportKind,
        fileName,
        fileSizeBytes,
        status,
        Optional.of(tokenHash),
        Optional.of(tokenExpiresAt),
        expiresAt,
        downloadedAt,
        createdAt,
        now);
  }

  /** Records that a download occurred at the given instant. */
  public ExportFile recordDownload(Instant now) {
    Objects.requireNonNull(now, "now must not be null");
    return new ExportFile(
        id,
        userId,
        jobId,
        exportKind,
        fileName,
        fileSizeBytes,
        status,
        downloadTokenHash,
        downloadTokenExpiresAt,
        expiresAt,
        Optional.of(now),
        createdAt,
        now);
  }

  /** Marks the export EXPIRED and clears the download token. */
  public ExportFile markExpired(Instant now) {
    Objects.requireNonNull(now, "now must not be null");
    return new ExportFile(
        id,
        userId,
        jobId,
        exportKind,
        fileName,
        fileSizeBytes,
        ExportFileStatus.EXPIRED,
        Optional.empty(),
        Optional.empty(),
        expiresAt,
        downloadedAt,
        createdAt,
        now);
  }

  /** Marks the export DELETED and clears the download token. */
  public ExportFile markDeleted(Instant now) {
    Objects.requireNonNull(now, "now must not be null");
    return new ExportFile(
        id,
        userId,
        jobId,
        exportKind,
        fileName,
        fileSizeBytes,
        ExportFileStatus.DELETED,
        Optional.empty(),
        Optional.empty(),
        expiresAt,
        downloadedAt,
        createdAt,
        now);
  }

  /** Returns true if the download token hash matches and has not expired. */
  public boolean isTokenValid(String presentedTokenHash, Instant now) {
    if (status != ExportFileStatus.READY) {
      return false;
    }
    if (expiresAt.isBefore(now)) {
      return false;
    }
    if (downloadTokenHash.isEmpty() || downloadTokenExpiresAt.isEmpty()) {
      return false;
    }
    if (downloadTokenExpiresAt.get().isBefore(now)) {
      return false;
    }
    return downloadTokenHash.get().equals(presentedTokenHash);
  }

  /** Returns true if this export is active (either GENERATING or READY). */
  public boolean isActive() {
    return status == ExportFileStatus.GENERATING || status == ExportFileStatus.READY;
  }
}
