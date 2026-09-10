package tech.buildwithpartha.lifeos.export.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.export.ExportFilePort;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.JobHandler;
import tech.buildwithpartha.lifeos.common.job.JobHandlerFor;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort;
import tech.buildwithpartha.lifeos.common.metrics.MetricsService;

/** Background job handler for compiling and storing full user data exports (LOS-1405, LOS-0517). */
@Component
@JobHandlerFor(BackgroundJobKind.DATA_EXPORT)
public class DataExportJobHandler implements JobHandler {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.export.audit");

  private static final Duration DOWNLOAD_TOKEN_TTL = Duration.ofHours(24);

  private final ExportArchiveBuilder archiveBuilder;
  private final ExportFilePort exportFilePort;
  private final TransactionalMailPort mailPort;
  private final Clock clock;
  private final ObjectMapper objectMapper;
  private final MetricsService metricsService;

  public DataExportJobHandler(
      ExportArchiveBuilder archiveBuilder,
      ExportFilePort exportFilePort,
      TransactionalMailPort mailPort,
      Clock clock) {
    this(archiveBuilder, exportFilePort, mailPort, clock, null);
  }

  @Autowired
  public DataExportJobHandler(
      ExportArchiveBuilder archiveBuilder,
      ExportFilePort exportFilePort,
      TransactionalMailPort mailPort,
      Clock clock,
      @Autowired(required = false) MetricsService metricsService) {
    this.archiveBuilder = archiveBuilder;
    this.exportFilePort = exportFilePort;
    this.mailPort = mailPort;
    this.clock = clock;
    this.objectMapper = new ObjectMapper();
    this.metricsService = metricsService != null ? metricsService : new MetricsService(null);
  }

  @Override
  @Transactional
  public void execute(JobContext context) {
    long startTime = System.currentTimeMillis();
    UUID userId =
        context
            .userId()
            .orElseThrow(() -> new IllegalStateException("DATA_EXPORT job missing userId"));

    ParsedPayload payload = parsePayload(context.payload());
    Instant now = clock.instant();

    try {
      byte[] archiveBytes = archiveBuilder.buildArchive(userId, now);

      exportFilePort.storeAndMarkReady(
          payload.exportFileId(),
          new ByteArrayInputStream(archiveBytes),
          archiveBytes.length,
          DOWNLOAD_TOKEN_TTL);

      if (payload.recipientEmail() != null && !payload.recipientEmail().isBlank()) {
        mailPort.enqueue(
            userId,
            MailMessageKind.SECURITY_ALERT,
            MailRecipient.of(payload.recipientEmail()),
            MailTemplateVariables.of(
                Map.of(
                    "displayName",
                    payload.displayName() != null ? payload.displayName() : "LifeOS User",
                    "eventDescription",
                    "Your requested data export archive is now ready for download.",
                    "occurredAt",
                    DateTimeFormatter.ISO_INSTANT.format(now))));
      }

      long duration = System.currentTimeMillis() - startTime;
      AUDIT_LOGGER.info(
          "event=data_export_completed userId={} exportFileId={} sizeBytes={}",
          userId,
          payload.exportFileId(),
          archiveBytes.length);

      metricsService.recordExportGeneration("FULL_DATA_EXPORT", "SUCCESS");
      metricsService.recordExportDuration("FULL_DATA_EXPORT", "SUCCESS", duration);
      metricsService.recordExportBytes("FULL_DATA_EXPORT", archiveBytes.length);
    } catch (RuntimeException e) {
      long duration = System.currentTimeMillis() - startTime;
      metricsService.recordExportGeneration("FULL_DATA_EXPORT", "FAILURE");
      metricsService.recordExportDuration("FULL_DATA_EXPORT", "FAILURE", duration);
      throw e;
    }
  }

  private record ParsedPayload(UUID exportFileId, String recipientEmail, String displayName) {}

  private ParsedPayload parsePayload(String jsonPayload) {
    try {
      JsonNode node = objectMapper.readTree(jsonPayload);
      if (node.hasNonNull("exportFileId")) {
        UUID exportFileId = UUID.fromString(node.get("exportFileId").asText());
        String email =
            node.hasNonNull("recipientEmail") ? node.get("recipientEmail").asText() : null;
        String name = node.hasNonNull("displayName") ? node.get("displayName").asText() : null;
        return new ParsedPayload(exportFileId, email, name);
      }
      throw new IllegalArgumentException("Payload missing exportFileId: " + jsonPayload);
    } catch (IOException e) {
      throw new IllegalArgumentException("Malformed payload JSON: " + jsonPayload, e);
    }
  }
}
