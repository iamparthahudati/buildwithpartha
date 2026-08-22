package tech.buildwithpartha.lifeos.export.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.InputStream;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;
import tech.buildwithpartha.lifeos.common.export.ExportFilePort;
import tech.buildwithpartha.lifeos.common.export.ExportSummary;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobPort;

class DataExportServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();

  private FakeExportFilePort exportFilePort;
  private FakeBackgroundJobPort jobPort;
  private DataExportService service;

  @BeforeEach
  void setUp() {
    exportFilePort = new FakeExportFilePort();
    jobPort = new FakeBackgroundJobPort();
    service = new DataExportService(exportFilePort, jobPort, Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void requestExport_createsExportRecordAndEnqueuesJob() {
    ExportSummary summary =
        service.requestExport(USER_ID, Optional.of("test@example.test"), Optional.of("Test User"));

    assertThat(summary.status()).isEqualTo("GENERATING");
    assertThat(summary.fileName()).contains("lifeos-export-");
    assertThat(jobPort.enqueuedJobs).hasSize(1);
    assertThat(jobPort.enqueuedJobs.get(0).kind()).isEqualTo(BackgroundJobKind.DATA_EXPORT);
    assertThat(jobPort.enqueuedJobs.get(0).userId()).isEqualTo(USER_ID);
    assertThat(jobPort.enqueuedJobs.get(0).payload()).contains("test@example.test");
  }

  @Test
  void requestExport_quotaExceeded_throwsFieldValidationException() {
    exportFilePort.quotaAllowed = false;

    assertThatThrownBy(() -> service.requestExport(USER_ID, Optional.empty(), Optional.empty()))
        .isInstanceOf(FieldValidationException.class)
        .hasMessageContaining("quota exceeded");
  }

  @Test
  void getExports_delegatesToExportFilePort() {
    exportFilePort.userExports.add(
        new ExportSummary(
            UUID.randomUUID(),
            "export.zip",
            Optional.of(100L),
            "READY",
            NOW.plusSeconds(3600),
            Optional.empty(),
            NOW));

    List<ExportSummary> list = service.getExports(USER_ID);
    assertThat(list).hasSize(1);
    assertThat(list.get(0).fileName()).isEqualTo("export.zip");
  }

  private static final class FakeExportFilePort implements ExportFilePort {
    boolean quotaAllowed = true;
    final List<ExportSummary> userExports = new ArrayList<>();

    @Override
    public boolean canCreateExport(UUID userId) {
      return quotaAllowed;
    }

    @Override
    public UUID initExport(
        UUID userId, Optional<UUID> jobId, ExportFileKind kind, String fileName) {
      return UUID.randomUUID();
    }

    @Override
    public String storeAndMarkReady(
        UUID exportFileId, InputStream contentStream, long fileSizeBytes, Duration tokenTtl) {
      return "token";
    }

    @Override
    public String issueDownloadToken(UUID exportFileId, UUID userId, Duration tokenTtl) {
      return "token";
    }

    @Override
    public void deleteExport(UUID exportFileId, UUID userId) {}

    @Override
    public List<ExportSummary> getExportsForUser(UUID userId) {
      return userExports;
    }
  }

  private static final class FakeBackgroundJobPort implements BackgroundJobPort {
    record EnqueuedJob(UUID userId, BackgroundJobKind kind, String payload) {}

    final List<EnqueuedJob> enqueuedJobs = new ArrayList<>();

    @Override
    public UUID enqueue(UUID userId, BackgroundJobKind kind, String jsonPayload) {
      enqueuedJobs.add(new EnqueuedJob(userId, kind, jsonPayload));
      return UUID.randomUUID();
    }
  }
}
