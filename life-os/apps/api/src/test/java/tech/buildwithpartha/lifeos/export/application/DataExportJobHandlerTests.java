package tech.buildwithpartha.lifeos.export.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
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
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;
import tech.buildwithpartha.lifeos.common.export.ExportFilePort;
import tech.buildwithpartha.lifeos.common.export.ExportSummary;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.JobHandler;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort;

class DataExportJobHandlerTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();
  private static final UUID EXPORT_FILE_ID = UUID.randomUUID();

  private FakeExportFilePort exportFilePort;
  private FakeTransactionalMailPort mailPort;
  private DataExportJobHandler handler;

  @BeforeEach
  void setUp() {
    UserDataExportContributor stubContributor =
        new UserDataExportContributor() {
          @Override
          public String exportFileName() {
            return "data.json";
          }

          @Override
          public byte[] exportDataForUser(UUID userId) {
            return "{}".getBytes(StandardCharsets.UTF_8);
          }
        };

    ExportArchiveBuilder builder = new ExportArchiveBuilder(List.of(stubContributor));
    exportFilePort = new FakeExportFilePort();
    mailPort = new FakeTransactionalMailPort();

    handler =
        new DataExportJobHandler(
            builder, exportFilePort, mailPort, Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void execute_generatesArchiveAndStoresReadyAndNotifiesUser() {
    String payload =
        "{\"exportFileId\":\""
            + EXPORT_FILE_ID
            + "\",\"recipientEmail\":\"test@example.test\",\"displayName\":\"Test User\"}";
    JobHandler.JobContext context =
        new JobHandler.JobContext(
            UUID.randomUUID(), Optional.of(USER_ID), BackgroundJobKind.DATA_EXPORT, payload, NOW);

    handler.execute(context);

    assertThat(exportFilePort.storedExportId).isEqualTo(EXPORT_FILE_ID);
    assertThat(exportFilePort.storedBytes).isNotNull();
    assertThat(mailPort.enqueuedMessages).hasSize(1);
    assertThat(mailPort.enqueuedMessages.get(0).kind()).isEqualTo(MailMessageKind.SECURITY_ALERT);
  }

  private static final class FakeExportFilePort implements ExportFilePort {
    UUID storedExportId;
    byte[] storedBytes;

    @Override
    public boolean canCreateExport(UUID userId) {
      return true;
    }

    @Override
    public UUID initExport(
        UUID userId, Optional<UUID> jobId, ExportFileKind kind, String fileName) {
      return UUID.randomUUID();
    }

    @Override
    public String storeAndMarkReady(
        UUID exportFileId, InputStream contentStream, long fileSizeBytes, Duration tokenTtl) {
      this.storedExportId = exportFileId;
      try {
        this.storedBytes = contentStream.readAllBytes();
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
      return "fake-download-token";
    }

    @Override
    public String issueDownloadToken(UUID exportFileId, UUID userId, Duration tokenTtl) {
      return "token";
    }

    @Override
    public void deleteExport(UUID exportFileId, UUID userId) {}

    @Override
    public List<ExportSummary> getExportsForUser(UUID userId) {
      return List.of();
    }
  }

  private static final class FakeTransactionalMailPort implements TransactionalMailPort {
    record EnqueuedMessage(
        UUID accountId,
        MailMessageKind kind,
        MailRecipient recipient,
        MailTemplateVariables vars) {}

    final List<EnqueuedMessage> enqueuedMessages = new ArrayList<>();

    @Override
    public void enqueue(
        UUID accountId,
        MailMessageKind kind,
        MailRecipient recipient,
        MailTemplateVariables templateVariables) {
      enqueuedMessages.add(new EnqueuedMessage(accountId, kind, recipient, templateVariables));
    }
  }
}
