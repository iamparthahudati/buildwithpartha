package tech.buildwithpartha.lifeos.export.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.export.domain.ExportFile;
import tech.buildwithpartha.lifeos.export.domain.ExportFileRepository;

@Component
class JpaExportFileRepository implements ExportFileRepository {

  private final ExportFileJpaRepository jpa;

  JpaExportFileRepository(ExportFileJpaRepository jpa) {
    this.jpa = jpa;
  }

  @Override
  public ExportFile save(ExportFile exportFile) {
    return toDomain(jpa.save(toEntity(exportFile)));
  }

  @Override
  public Optional<ExportFile> findById(UUID id) {
    return jpa.findById(id).map(JpaExportFileRepository::toDomain);
  }

  @Override
  public Optional<ExportFile> findByDownloadTokenHash(String tokenHash) {
    return jpa.findByDownloadTokenHash(tokenHash).map(JpaExportFileRepository::toDomain);
  }

  @Override
  public List<ExportFile> findByUserId(UUID userId) {
    return jpa.findByUserId(userId).stream().map(JpaExportFileRepository::toDomain).toList();
  }

  @Override
  public long countActiveByUserId(UUID userId) {
    return jpa.countActiveByUserId(userId);
  }

  @Override
  public List<ExportFile> findOverdueReady(Instant now) {
    return jpa.findOverdueReady(now).stream().map(JpaExportFileRepository::toDomain).toList();
  }

  @Override
  public int deleteTerminalOlderThan(Instant cutoff) {
    return jpa.deleteTerminalOlderThan(cutoff);
  }

  private static ExportFileEntity toEntity(ExportFile file) {
    return new ExportFileEntity(
        file.id(),
        file.userId(),
        file.jobId().orElse(null),
        file.exportKind(),
        file.fileName(),
        file.fileSizeBytes().orElse(null),
        file.status(),
        file.downloadTokenHash().orElse(null),
        file.downloadTokenExpiresAt().orElse(null),
        file.expiresAt(),
        file.downloadedAt().orElse(null),
        file.createdAt(),
        file.updatedAt());
  }

  private static ExportFile toDomain(ExportFileEntity entity) {
    return new ExportFile(
        entity.getId(),
        entity.getUserId(),
        Optional.ofNullable(entity.getJobId()),
        entity.getExportKind(),
        entity.getFileName(),
        Optional.ofNullable(entity.getFileSizeBytes()),
        entity.getStatus(),
        Optional.ofNullable(entity.getDownloadTokenHash()),
        Optional.ofNullable(entity.getDownloadTokenExpiresAt()),
        entity.getExpiresAt(),
        Optional.ofNullable(entity.getDownloadedAt()),
        entity.getCreatedAt(),
        entity.getUpdatedAt());
  }
}
