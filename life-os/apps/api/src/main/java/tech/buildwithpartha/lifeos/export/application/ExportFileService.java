package tech.buildwithpartha.lifeos.export.application;

import java.io.InputStream;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;
import tech.buildwithpartha.lifeos.common.export.ExportFilePort;
import tech.buildwithpartha.lifeos.export.domain.ExportFile;
import tech.buildwithpartha.lifeos.export.domain.ExportFileRepository;
import tech.buildwithpartha.lifeos.export.domain.ExportFileStatus;

/**
 * Service managing export file metadata, quota checks, and token lifecycle (LOS-1405).
 */
@Service
public class ExportFileService {

  private static final Logger log = LoggerFactory.getLogger(ExportFileService.class);

  private final ExportFileRepository repository;
  private final ExportStoragePort storagePort;
  private final ExportTokenService tokenService;
  private final Clock clock;

  public ExportFileService(
      ExportFileRepository repository,
      ExportStoragePort storagePort,
      ExportTokenService tokenService,
      Clock clock) {
    this.repository = repository;
    this.storagePort = storagePort;
    this.tokenService = tokenService;
    this.clock = clock;
  }

  /**
   * Returns true if user has fewer than MAX_ACTIVE_EXPORTS_PER_USER active export files.
   */
  @Transactional(readOnly = true)
  public boolean canCreateExport(UUID userId) {
    long activeCount = repository.countActiveByUserId(userId);
    return activeCount < ExportFilePort.MAX_ACTIVE_EXPORTS_PER_USER;
  }

  /**
   * Initializes a new export file record in GENERATING status.
   */
  @Transactional
  public UUID initExport(
      UUID userId, Optional<UUID> jobId, ExportFileKind kind, String fileName) {
    if (!canCreateExport(userId)) {
      throw new IllegalStateException("Export quota exceeded for user: " + userId);
    }
    UUID id = UUID.randomUUID();
    Instant now = clock.instant();
    Instant expiresAt = now.plus(ExportFilePort.EXPORT_RETENTION_PERIOD);
    ExportFile exportFile =
        ExportFile.createGenerating(id, userId, jobId, kind, fileName, expiresAt, now);
    repository.save(exportFile);
    log.info("export initialized id={} userId={} kind={}", id, userId, kind);
    return id;
  }

  /**
   * Stores generated archive bytes and marks the record READY with an initial download token.
   */
  @Transactional
  public String storeAndMarkReady(
      UUID exportFileId, InputStream contentStream, long fileSizeBytes, Duration tokenTtl) {
    ExportFile exportFile =
        repository
            .findById(exportFileId)
            .orElseThrow(() -> new ResourceNotFoundException("Export file not found"));

    storagePort.store(exportFileId, contentStream);

    Instant now = clock.instant();
    String rawToken = tokenService.generateToken();
    String tokenHash = tokenService.hashToken(rawToken);
    Instant tokenExpiresAt = now.plus(tokenTtl);

    ExportFile ready = exportFile.markReady(fileSizeBytes, tokenHash, tokenExpiresAt, now);
    repository.save(ready);
    log.info(
        "export ready id={} userId={} sizeBytes={} tokenExpiresAt={}",
        ready.id(),
        ready.userId(),
        fileSizeBytes,
        tokenExpiresAt);
    return rawToken;
  }

  /**
   * Issues a fresh download token for an existing READY export file.
   */
  @Transactional
  public String issueDownloadToken(UUID exportFileId, UUID userId, Duration tokenTtl) {
    ExportFile exportFile =
        repository
            .findById(exportFileId)
            .orElseThrow(() -> new ResourceNotFoundException("Export file not found"));

    if (!exportFile.userId().equals(userId)) {
      throw new ResourceNotFoundException("Export file not found");
    }
    if (exportFile.status() != ExportFileStatus.READY) {
      throw new IllegalStateException("Export file is not ready for download");
    }

    Instant now = clock.instant();
    if (exportFile.expiresAt().isBefore(now)) {
      throw new IllegalStateException("Export file has expired");
    }

    String rawToken = tokenService.generateToken();
    String tokenHash = tokenService.hashToken(rawToken);
    Instant tokenExpiresAt = now.plus(tokenTtl);

    ExportFile updated = exportFile.withNewDownloadToken(tokenHash, tokenExpiresAt, now);
    repository.save(updated);
    log.info("issued download token exportId={} userId={}", exportFileId, userId);
    return rawToken;
  }

  /**
   * Marks an export file as deleted and removes its physical file from storage.
   */
  @Transactional
  public void deleteExport(UUID exportFileId, UUID userId) {
    ExportFile exportFile =
        repository
            .findById(exportFileId)
            .orElseThrow(() -> new ResourceNotFoundException("Export file not found"));

    if (!exportFile.userId().equals(userId)) {
      throw new ResourceNotFoundException("Export file not found");
    }

    storagePort.delete(exportFileId);
    Instant now = clock.instant();
    ExportFile deleted = exportFile.markDeleted(now);
    repository.save(deleted);
    log.info("export deleted id={} userId={}", exportFileId, userId);
  }

  /**
   * Finds overdue READY exports, marks them EXPIRED, and deletes their storage.
   */
  @Transactional
  public int expireOverdueExports() {
    Instant now = clock.instant();
    List<ExportFile> overdue = repository.findOverdueReady(now);
    for (ExportFile export : overdue) {
      storagePort.delete(export.id());
      repository.save(export.markExpired(now));
      log.info("export expired id={} userId={}", export.id(), export.userId());
    }
    return overdue.size();
  }

  /**
   * Purges terminal records older than 7 days from the database.
   */
  @Transactional
  public int purgeOldTerminalRecords(Duration retention) {
    Instant cutoff = clock.instant().minus(retention);
    int purged = repository.deleteTerminalOlderThan(cutoff);
    log.info("purged terminal export records count={} cutoff={}", purged, cutoff);
    return purged;
  }
}
