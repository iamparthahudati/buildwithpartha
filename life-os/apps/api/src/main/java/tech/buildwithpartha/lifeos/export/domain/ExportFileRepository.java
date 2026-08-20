package tech.buildwithpartha.lifeos.export.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Domain persistence port for {@link ExportFile} (LOS-1405). */
public interface ExportFileRepository {

  /** Saves or updates an {@link ExportFile}. */
  ExportFile save(ExportFile exportFile);

  /** Finds an export file by its unique identifier. */
  Optional<ExportFile> findById(UUID id);

  /** Finds an export file by its current download token hash. */
  Optional<ExportFile> findByDownloadTokenHash(String tokenHash);

  /** Finds all export files for a user ordered by creation descending. */
  List<ExportFile> findByUserId(UUID userId);

  /** Counts active (GENERATING or READY) exports for a specific user. */
  long countActiveByUserId(UUID userId);

  /** Finds all export files in READY status that have passed their file expiration cutoff. */
  List<ExportFile> findOverdueReady(Instant now);

  /**
   * Purges terminal (EXPIRED or DELETED) export file metadata rows older than cutoff (R1
   * retention).
   */
  int deleteTerminalOlderThan(Instant cutoff);
}
