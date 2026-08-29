package tech.buildwithpartha.lifeos.export.infrastructure;

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
import tech.buildwithpartha.lifeos.common.export.ExportFilePort;
import tech.buildwithpartha.lifeos.export.application.ExportDownloadService;
import tech.buildwithpartha.lifeos.export.application.ExportFileService;
import tech.buildwithpartha.lifeos.export.application.ExportTokenService;
import tech.buildwithpartha.lifeos.export.domain.ExportFile;
import tech.buildwithpartha.lifeos.export.domain.ExportFileRepository;
import tech.buildwithpartha.lifeos.export.domain.ExportFileStatus;

class ExportFilePortAdapterTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();

  private ExportFileRepository repository;
  private LocalExportFileStorage storage;
  private ExportFileService service;
  private ExportFilePort adapter;

  @BeforeEach
  void setUp(@org.junit.jupiter.api.io.TempDir java.nio.file.Path tempDir) {
    repository = new tech.buildwithpartha.lifeos.export.application.FakeExportFileRepository();
    storage = new LocalExportFileStorage(tempDir.toString());
    service =
        new ExportFileService(
            repository, storage, new ExportTokenService(), Clock.fixed(NOW, ZoneOffset.UTC));
    ExportDownloadService downloadService =
        new ExportDownloadService(
            repository, storage, new ExportTokenService(), Clock.fixed(NOW, ZoneOffset.UTC));
    adapter = new ExportFilePortAdapter(service, downloadService);
  }

  @Test
  void portAdapter_delegatesAllMethods() {
    assertThat(adapter.canCreateExport(USER_ID)).isTrue();

    UUID exportId =
        adapter.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    assertThat(exportId).isNotNull();

    byte[] data = "payload".getBytes(StandardCharsets.UTF_8);
    String token =
        adapter.storeAndMarkReady(
            exportId, new ByteArrayInputStream(data), data.length, Duration.ofMinutes(30));
    assertThat(token).isNotBlank();

    String refreshedToken = adapter.issueDownloadToken(exportId, USER_ID, Duration.ofMinutes(15));
    assertThat(refreshedToken).isNotBlank();

    adapter.deleteExport(exportId, USER_ID);
    ExportFile deleted = repository.findById(exportId).orElseThrow();
    assertThat(deleted.status()).isEqualTo(ExportFileStatus.DELETED);
  }
}
