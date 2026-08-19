package tech.buildwithpartha.lifeos.common.export;

import java.io.InputStream;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

/**
 * Cross-domain port for managing the private lifecycle of generated export files (LOS-1405).
 */
public interface ExportFilePort {

  /**
   * Maximum active (GENERATING or READY) export archives allowed per user at any time.
   */
  int MAX_ACTIVE_EXPORTS_PER_USER = 3;

  /**
   * Default retention period before an export file is expired and deleted.
   */
  Duration EXPORT_RETENTION_PERIOD = Duration.ofDays(7);

  /**
   * Checks whether the user has exceeded their active export quota.
   *
   * @param userId the user id
   * @return true if the user can create a new export, false if at or over quota
   */
  boolean canCreateExport(UUID userId);

  /**
   * Initializes a new export file record in {@code GENERATING} status.
   *
   * @param userId the owning user id
   * @param jobId the background job generating this export, if any
   * @param kind the kind of export
   * @param fileName the target archive file name (e.g. {@code lifeos-export-2026-08-19.zip})
   * @return the generated export file id
   */
  UUID initExport(UUID userId, Optional<UUID> jobId, ExportFileKind kind, String fileName);

  /**
   * Stores the generated file content to private storage and marks the export record {@code READY}.
   * Generates a raw download token and stores its cryptographic hash.
   *
   * @param exportFileId the export file id
   * @param contentStream the input stream containing the file bytes
   * @param fileSizeBytes the size in bytes
   * @param tokenTtl the time-to-live for the issued download token
   * @return the raw download token to be delivered to the user
   */
  String storeAndMarkReady(
      UUID exportFileId, InputStream contentStream, long fileSizeBytes, Duration tokenTtl);

  /**
   * Issues a fresh download token for an existing {@code READY} export file.
   *
   * @param exportFileId the export file id
   * @param userId the requesting user id (must own the export)
   * @param tokenTtl the time-to-live for the new token
   * @return the raw download token
   */
  String issueDownloadToken(UUID exportFileId, UUID userId, Duration tokenTtl);

  /**
   * Marks an export file as deleted and removes its physical file from storage.
   *
   * @param exportFileId the export file id
   * @param userId the requesting user id (must own the export)
   */
  void deleteExport(UUID exportFileId, UUID userId);
}
