package tech.buildwithpartha.lifeos.export.infrastructure;

import java.io.InputStream;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;
import tech.buildwithpartha.lifeos.common.export.ExportFilePort;
import tech.buildwithpartha.lifeos.export.application.ExportFileService;

/**
 * Adapts {@link ExportFilePort} (in {@code common.export}) to the internal {@link
 * ExportFileService} (in {@code export.application}). Other domains inject {@link ExportFilePort}
 * and never import {@code export.*} directly, preserving domain boundary rules.
 */
@Component
class ExportFilePortAdapter implements ExportFilePort {

  private final ExportFileService exportFileService;

  ExportFilePortAdapter(ExportFileService exportFileService) {
    this.exportFileService = exportFileService;
  }

  @Override
  public boolean canCreateExport(UUID userId) {
    return exportFileService.canCreateExport(userId);
  }

  @Override
  public UUID initExport(
      UUID userId, Optional<UUID> jobId, ExportFileKind kind, String fileName) {
    return exportFileService.initExport(userId, jobId, kind, fileName);
  }

  @Override
  public String storeAndMarkReady(
      UUID exportFileId, InputStream contentStream, long fileSizeBytes, Duration tokenTtl) {
    return exportFileService.storeAndMarkReady(
        exportFileId, contentStream, fileSizeBytes, tokenTtl);
  }

  @Override
  public String issueDownloadToken(UUID exportFileId, UUID userId, Duration tokenTtl) {
    return exportFileService.issueDownloadToken(exportFileId, userId, tokenTtl);
  }

  @Override
  public void deleteExport(UUID exportFileId, UUID userId) {
    exportFileService.deleteExport(exportFileId, userId);
  }

  @Override
  public java.util.List<tech.buildwithpartha.lifeos.common.export.ExportSummary> getExportsForUser(
      UUID userId) {
    return exportFileService.getExportsForUser(userId);
  }
}
