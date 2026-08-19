package tech.buildwithpartha.lifeos.export.application;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.export.domain.ExportFile;
import tech.buildwithpartha.lifeos.export.domain.ExportFileRepository;
import tech.buildwithpartha.lifeos.export.domain.ExportFileStatus;

/**
 * In-memory repository fake for export file tests.
 */
public final class FakeExportFileRepository implements ExportFileRepository {

  private final List<ExportFile> store = new ArrayList<>();

  @Override
  public ExportFile save(ExportFile exportFile) {
    store.removeIf(existing -> existing.id().equals(exportFile.id()));
    store.add(exportFile);
    return exportFile;
  }

  @Override
  public Optional<ExportFile> findById(UUID id) {
    return store.stream().filter(f -> f.id().equals(id)).findFirst();
  }

  @Override
  public Optional<ExportFile> findByDownloadTokenHash(String tokenHash) {
    return store.stream()
        .filter(f -> f.downloadTokenHash().map(h -> h.equals(tokenHash)).orElse(false))
        .findFirst();
  }

  @Override
  public List<ExportFile> findByUserId(UUID userId) {
    return store.stream()
        .filter(f -> f.userId().equals(userId))
        .sorted((a, b) -> b.createdAt().compareTo(a.createdAt()))
        .toList();
  }

  @Override
  public long countActiveByUserId(UUID userId) {
    return store.stream().filter(f -> f.userId().equals(userId) && f.isActive()).count();
  }

  @Override
  public List<ExportFile> findOverdueReady(Instant now) {
    return store.stream()
        .filter(f -> f.status() == ExportFileStatus.READY && !f.expiresAt().isAfter(now))
        .toList();
  }

  @Override
  public int deleteTerminalOlderThan(Instant cutoff) {
    long before = store.size();
    store.removeIf(
        f ->
            (f.status() == ExportFileStatus.EXPIRED || f.status() == ExportFileStatus.DELETED)
                && f.updatedAt().isBefore(cutoff));
    return (int) (before - store.size());
  }

  List<ExportFile> all() {
    return List.copyOf(store);
  }
}
