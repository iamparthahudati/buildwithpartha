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
import tech.buildwithpartha.lifeos.common.error.InvalidCredentialsException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.error.TokenExpiredException;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;
import tech.buildwithpartha.lifeos.export.domain.ExportFile;

class ExportDownloadServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();

  private FakeExportFileRepository repository;
  private FakeExportStoragePort storagePort;
  private ExportTokenService tokenService;
  private ExportFileService fileService;
  private ExportDownloadService downloadService;

  @BeforeEach
  void setUp() {
    repository = new FakeExportFileRepository();
    storagePort = new FakeExportStoragePort();
    tokenService = new ExportTokenService();
    Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    fileService = new ExportFileService(repository, storagePort, tokenService, clock);
    downloadService = new ExportDownloadService(repository, storagePort, tokenService, clock);
  }

  @Test
  void openDownloadStream_validToken_streamsContentAndRecordsDownload() throws Exception {
    UUID exportId =
        fileService.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    byte[] content = "hello export world".getBytes(StandardCharsets.UTF_8);
    String token =
        fileService.storeAndMarkReady(
            exportId, new ByteArrayInputStream(content), content.length, Duration.ofMinutes(30));

    ExportDownloadService.DownloadPayload payload =
        downloadService.openDownloadStream(token, USER_ID);

    assertThat(payload.exportId()).isEqualTo(exportId);
    assertThat(payload.fileName()).isEqualTo("archive.zip");
    assertThat(payload.fileSizeBytes()).isEqualTo(content.length);
    assertThat(payload.contentStream().readAllBytes()).isEqualTo(content);

    ExportFile updated = repository.findById(exportId).orElseThrow();
    assertThat(updated.downloadedAt()).contains(NOW);
  }

  @Test
  void openDownloadStream_nullOrBlankToken_throwsInvalidCredentials() {
    assertThatThrownBy(() -> downloadService.openDownloadStream(null, USER_ID))
        .isInstanceOf(InvalidCredentialsException.class);
    assertThatThrownBy(() -> downloadService.openDownloadStream("   ", USER_ID))
        .isInstanceOf(InvalidCredentialsException.class);
  }

  @Test
  void openDownloadStream_unknownToken_throwsResourceNotFound() {
    assertThatThrownBy(() -> downloadService.openDownloadStream("unknown-token", USER_ID))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void openDownloadStream_differentUser_throwsResourceNotFound() {
    UUID exportId =
        fileService.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    byte[] content = "data".getBytes(StandardCharsets.UTF_8);
    String token =
        fileService.storeAndMarkReady(
            exportId, new ByteArrayInputStream(content), content.length, Duration.ofMinutes(30));

    UUID otherUser = UUID.randomUUID();
    assertThatThrownBy(() -> downloadService.openDownloadStream(token, otherUser))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void openDownloadStream_expiredToken_throwsTokenExpiredException() {
    UUID exportId =
        fileService.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    byte[] content = "data".getBytes(StandardCharsets.UTF_8);
    String token =
        fileService.storeAndMarkReady(
            exportId, new ByteArrayInputStream(content), content.length, Duration.ofMinutes(30));

    // Fast-forward time past token expiry
    Instant later = NOW.plus(Duration.ofMinutes(45));
    ExportDownloadService laterDownloadService =
        new ExportDownloadService(
            repository, storagePort, tokenService, Clock.fixed(later, ZoneOffset.UTC));

    assertThatThrownBy(() -> laterDownloadService.openDownloadStream(token, USER_ID))
        .isInstanceOf(TokenExpiredException.class)
        .hasMessageContaining("expired");
  }

  @Test
  void openDownloadStream_notReadyStatus_throwsResourceNotFound() {
    UUID exportId =
        fileService.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    // Still in GENERATING status, with synthetic token
    ExportFile generating = repository.findById(exportId).orElseThrow();
    ExportFile withToken =
        generating.withNewDownloadToken(
            tokenService.hashToken("my-token"), NOW.plusSeconds(1800), NOW);
    repository.save(withToken);

    assertThatThrownBy(() -> downloadService.openDownloadStream("my-token", USER_ID))
        .isInstanceOf(ResourceNotFoundException.class)
        .hasMessageContaining("not available");
  }

  @Test
  void openDownloadStream_fileRetentionExpired_throwsTokenExpiredException() {
    UUID exportId =
        fileService.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    byte[] content = "data".getBytes(StandardCharsets.UTF_8);
    String token =
        fileService.storeAndMarkReady(
            exportId, new ByteArrayInputStream(content), content.length, Duration.ofMinutes(30));

    // Force expiresAt in past
    ExportFile ready = repository.findById(exportId).orElseThrow();
    ExportFile expired =
        new ExportFile(
            ready.id(),
            ready.userId(),
            ready.jobId(),
            ready.exportKind(),
            ready.fileName(),
            ready.fileSizeBytes(),
            ready.status(),
            ready.downloadTokenHash(),
            ready.downloadTokenExpiresAt(),
            NOW.minusSeconds(10),
            ready.downloadedAt(),
            ready.createdAt(),
            ready.updatedAt());
    repository.save(expired);

    assertThatThrownBy(() -> downloadService.openDownloadStream(token, USER_ID))
        .isInstanceOf(TokenExpiredException.class)
        .hasMessageContaining("expired");
  }

  @Test
  void openDownloadStream_missingPhysicalStorage_throwsResourceNotFound() {
    UUID exportId =
        fileService.initExport(
            USER_ID, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    byte[] content = "data".getBytes(StandardCharsets.UTF_8);
    String token =
        fileService.storeAndMarkReady(
            exportId, new ByteArrayInputStream(content), content.length, Duration.ofMinutes(30));

    // Delete physical storage
    storagePort.delete(exportId);

    assertThatThrownBy(() -> downloadService.openDownloadStream(token, USER_ID))
        .isInstanceOf(ResourceNotFoundException.class)
        .hasMessageContaining("Physical export file not found");
  }
}
