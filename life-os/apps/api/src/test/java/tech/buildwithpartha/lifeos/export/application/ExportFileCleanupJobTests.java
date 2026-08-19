package tech.buildwithpartha.lifeos.export.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;
import tech.buildwithpartha.lifeos.export.domain.ExportFile;

class ExportFileCleanupJobTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();

  private FakeExportFileRepository repository;
  private FakeExportStoragePort storagePort;
  private ExportTokenService tokenService;
  private ExportFileService service;
  private ExportFileCleanupJob cleanupJob;

  @BeforeEach
  void setUp() {
    repository = new FakeExportFileRepository();
    storagePort = new FakeExportStoragePort();
    tokenService = new ExportTokenService();
    service =
        new ExportFileService(
            repository, storagePort, tokenService, Clock.fixed(NOW, ZoneOffset.UTC));
    cleanupJob = new ExportFileCleanupJob(service);
  }

  @Test
  void runDailyCleanup_expiresOverdueAndPurgesOldTerminal() {
    UUID exportId =
        service.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    byte[] content = "data".getBytes(StandardCharsets.UTF_8);
    service.storeAndMarkReady(
        exportId, new ByteArrayInputStream(content), content.length, Duration.ofMinutes(30));

    // Force expired in the past
    ExportFile past = repository.findById(exportId).orElseThrow();
    ExportFile expiredPast =
        new ExportFile(
            past.id(),
            past.userId(),
            past.jobId(),
            past.exportKind(),
            past.fileName(),
            past.fileSizeBytes(),
            past.status(),
            past.downloadTokenHash(),
            past.downloadTokenExpiresAt(),
            NOW.minusSeconds(3600),
            past.downloadedAt(),
            NOW.minus(Duration.ofDays(10)),
            NOW.minus(Duration.ofDays(10)));
    repository.save(expiredPast);

    cleanupJob.runDailyCleanup();

    // The overdue file should have been expired and its storage deleted
    assertThat(storagePort.exists(exportId)).isFalse();
  }
}
