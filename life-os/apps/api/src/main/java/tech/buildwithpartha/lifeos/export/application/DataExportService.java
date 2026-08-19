package tech.buildwithpartha.lifeos.export.application;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;
import tech.buildwithpartha.lifeos.common.export.ExportFilePort;
import tech.buildwithpartha.lifeos.common.export.ExportSummary;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobPort;

/**
 * Coordinates user data export requests, quota verification, and status retrieval (LOS-0517).
 */
@Service
public class DataExportService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.export.audit");

  private static final DateTimeFormatter FILE_DATE_FORMATTER =
      DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").withZone(ZoneOffset.UTC);

  private final ExportFilePort exportFilePort;
  private final BackgroundJobPort backgroundJobPort;
  private final Clock clock;

  public DataExportService(
      ExportFilePort exportFilePort,
      BackgroundJobPort backgroundJobPort,
      Clock clock) {
    this.exportFilePort = exportFilePort;
    this.backgroundJobPort = backgroundJobPort;
    this.clock = clock;
  }

  /**
   * Requests a new asynchronous data export for the authenticated user.
   *
   * @param userId the requesting user
   * @param recipientEmail optional notification email address
   * @param displayName optional user display name
   * @return the initialized export file summary
   */
  @Transactional
  public ExportSummary requestExport(
      UUID userId, Optional<String> recipientEmail, Optional<String> displayName) {
    if (!exportFilePort.canCreateExport(userId)) {
      AUDIT_LOGGER.info("event=data_export_rejected reason=quota_exceeded userId={}", userId);
      throw new FieldValidationException(
          "Export quota exceeded (maximum 3 active exports allowed)",
          List.of(new FieldProblem("export", "EXPORT_QUOTA_EXCEEDED")));
    }

    Instant now = clock.instant();
    String fileName = "lifeos-export-" + FILE_DATE_FORMATTER.format(now) + ".zip";

    UUID exportFileId =
        exportFilePort.initExport(
            userId, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, fileName);

    StringBuilder payload = new StringBuilder();
    payload.append("{\"exportFileId\":\"").append(exportFileId).append("\"");
    recipientEmail.ifPresent(
        email -> payload.append(",\"recipientEmail\":\"").append(email).append("\""));
    displayName.ifPresent(
        name -> payload.append(",\"displayName\":\"").append(name).append("\""));
    payload.append("}");

    UUID jobId =
        backgroundJobPort.enqueue(userId, BackgroundJobKind.DATA_EXPORT, payload.toString());

    AUDIT_LOGGER.info(
        "event=data_export_requested userId={} exportFileId={} jobId={}",
        userId,
        exportFileId,
        jobId);

    return new ExportSummary(
        exportFileId,
        fileName,
        Optional.empty(),
        "GENERATING",
        now.plus(ExportFilePort.EXPORT_RETENTION_PERIOD),
        Optional.empty(),
        now);
  }

  /**
   * Retrieves all export history records for the user.
   */
  @Transactional(readOnly = true)
  public List<ExportSummary> getExports(UUID userId) {
    return exportFilePort.getExportsForUser(userId);
  }
}
