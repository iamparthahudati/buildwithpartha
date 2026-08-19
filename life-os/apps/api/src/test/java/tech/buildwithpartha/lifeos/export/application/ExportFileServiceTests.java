package tech.buildwithpartha.lifeos.export.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;
import tech.buildwithpartha.lifeos.export.domain.ExportFile;
import tech.buildwithpartha.lifeos.export.domain.ExportFileStatus;

class ExportFileServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();

  private FakeExportFileRepository repository;
  private FakeExportStoragePort storagePort;
  private ExportTokenService tokenService;
  private ExportFileService service;

  @BeforeEach
  void setUp() {
    repository = new FakeExportFileRepository();
    storagePort = new FakeExportStoragePort();
    tokenService = new ExportTokenService();
    service =
        new ExportFileService(
            repository, storagePort, tokenService, Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void canCreateExport_enforcesQuotaLimit() {
    assertThat(service.canCreateExport(USER_ID)).isTrue();

    // Add 3 active exports
    for (int i = 0; i < 3; i++) {
      service.initExport(
          USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "export-" + i + ".zip");
    }

    assertThat(service.canCreateExport(USER_ID)).isFalse();
    assertThatThrownBy(
            () ->
                service.initExport(
                    USER_ID,
                    Optional.empty(),
                    ExportFileKind.FULL_DATA_EXPORT,
                    "overflow.zip"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("quota exceeded");
  }

  @Test
  void initExport_and_storeAndMarkReady_fullLifecycle() {
    UUID exportId =
        service.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");

    ExportFile initiated = repository.findById(exportId).orElseThrow();
    assertThat(initiated.status()).isEqualTo(ExportFileStatus.GENERATING);

    byte[] content = "test archive data".getBytes(StandardCharsets.UTF_8);
    String token =
        service.storeAndMarkReady(
            exportId,
            new ByteArrayInputStream(content),
            content.length,
            Duration.ofMinutes(30));

    assertThat(token).isNotBlank();
    assertThat(storagePort.exists(exportId)).isTrue();
    assertThat(storagePort.getBytes(exportId)).isEqualTo(content);

    ExportFile ready = repository.findById(exportId).orElseThrow();
    assertThat(ready.status()).isEqualTo(ExportFileStatus.READY);
    assertThat(ready.fileSizeBytes()).contains((long) content.length);
    assertThat(ready.downloadTokenHash()).contains(tokenService.hashToken(token));
  }

  @Test
  void issueDownloadToken_generatesNewTokenForOwner() {
    UUID exportId =
        service.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    byte[] content = "test data".getBytes(StandardCharsets.UTF_8);
    service.storeAndMarkReady(
        exportId, new ByteArrayInputStream(content), content.length, Duration.ofMinutes(30));

    String newToken = service.issueDownloadToken(exportId, USER_ID, Duration.ofMinutes(15));
    assertThat(newToken).isNotBlank();

    ExportFile updated = repository.findById(exportId).orElseThrow();
    assertThat(updated.downloadTokenHash()).contains(tokenService.hashToken(newToken));
  }

  @Test
  void issueDownloadToken_rejectsNonOwnerOrMissing() {
    UUID exportId =
        service.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    byte[] content = "test data".getBytes(StandardCharsets.UTF_8);
    service.storeAndMarkReady(
        exportId, new ByteArrayInputStream(content), content.length, Duration.ofMinutes(30));

    UUID otherUser = UUID.randomUUID();
    assertThatThrownBy(
            () -> service.issueDownloadToken(exportId, otherUser, Duration.ofMinutes(15)))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void deleteExport_removesStorageAndMarksDeleted() {
    UUID exportId =
        service.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    byte[] content = "test data".getBytes(StandardCharsets.UTF_8);
    service.storeAndMarkReady(
        exportId, new ByteArrayInputStream(content), content.length, Duration.ofMinutes(30));

    assertThat(storagePort.exists(exportId)).isTrue();
    service.deleteExport(exportId, USER_ID);

    assertThat(storagePort.exists(exportId)).isFalse();
    ExportFile deleted = repository.findById(exportId).orElseThrow();
    assertThat(deleted.status()).isEqualTo(ExportFileStatus.DELETED);
  }

  @Test
  void expireOverdueExports_marksExpiredAndDeletesStorage() {
    UUID exportId =
        service.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    byte[] content = "test data".getBytes(StandardCharsets.UTF_8);
    service.storeAndMarkReady(
        exportId, new ByteArrayInputStream(content), content.length, Duration.ofMinutes(30));

    // Force expiresAt to be in the past
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
            past.createdAt(),
            past.updatedAt());
    repository.save(expiredPast);

    int expired = service.expireOverdueExports();
    assertThat(expired).isEqualTo(1);
    assertThat(storagePort.exists(exportId)).isFalse();

    ExportFile after = repository.findById(exportId).orElseThrow();
    assertThat(after.status()).isEqualTo(ExportFileStatus.EXPIRED);
  }
}
