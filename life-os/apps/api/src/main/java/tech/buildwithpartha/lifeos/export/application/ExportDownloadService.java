package tech.buildwithpartha.lifeos.export.application;

import java.io.InputStream;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.InvalidCredentialsException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.error.TokenExpiredException;
import tech.buildwithpartha.lifeos.export.domain.ExportFile;
import tech.buildwithpartha.lifeos.export.domain.ExportFileRepository;
import tech.buildwithpartha.lifeos.export.domain.ExportFileStatus;

/** Validates download tokens and retrieves private file streams for authorized users (LOS-1405). */
@Service
public class ExportDownloadService {

  private final ExportFileRepository repository;
  private final ExportStoragePort storagePort;
  private final ExportTokenService tokenService;
  private final Clock clock;

  public ExportDownloadService(
      ExportFileRepository repository,
      ExportStoragePort storagePort,
      ExportTokenService tokenService,
      Clock clock) {
    this.repository = repository;
    this.storagePort = storagePort;
    this.tokenService = tokenService;
    this.clock = clock;
  }

  /** Result record holding file metadata and the content input stream. */
  public record DownloadPayload(
      UUID exportId, String fileName, long fileSizeBytes, InputStream contentStream) {}

  /**
   * Validates download token, verifies user ownership and file status, and opens a stream.
   *
   * @param rawToken the raw download token provided in the request
   * @param authenticatedUserId the authenticated user requesting the download
   * @return payload containing metadata and content stream
   */
  @Transactional
  public DownloadPayload openDownloadStream(String rawToken, UUID authenticatedUserId) {
    if (rawToken == null || rawToken.isBlank()) {
      throw new InvalidCredentialsException("Invalid download token");
    }

    String tokenHash = tokenService.hashToken(rawToken.trim());
    ExportFile exportFile =
        repository
            .findByDownloadTokenHash(tokenHash)
            .orElseThrow(() -> new ResourceNotFoundException("Export file not found"));

    if (!exportFile.userId().equals(authenticatedUserId)) {
      throw new ResourceNotFoundException("Export file not found");
    }

    Instant now = clock.instant();

    if (exportFile.status() != ExportFileStatus.READY) {
      throw new ResourceNotFoundException("Export file is not available");
    }

    if (exportFile.expiresAt().isBefore(now)) {
      throw new TokenExpiredException("Export file has expired");
    }

    Optional<Instant> tokenExpiresAt = exportFile.downloadTokenExpiresAt();
    if (tokenExpiresAt.isEmpty() || tokenExpiresAt.get().isBefore(now)) {
      throw new TokenExpiredException("Download token has expired");
    }

    if (!storagePort.exists(exportFile.id())) {
      throw new ResourceNotFoundException("Physical export file not found in storage");
    }

    ExportFile recorded = exportFile.recordDownload(now);
    repository.save(recorded);

    InputStream stream = storagePort.read(exportFile.id());
    long size = exportFile.fileSizeBytes().orElse(0L);

    return new DownloadPayload(exportFile.id(), exportFile.fileName(), size, stream);
  }
}
