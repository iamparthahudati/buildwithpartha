package tech.buildwithpartha.lifeos.attachment.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentRepository;
import tech.buildwithpartha.lifeos.common.audit.AuditOutcome;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditCommand;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditEventType;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditPort;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.JobHandler;
import tech.buildwithpartha.lifeos.common.job.JobHandlerFor;

/**
 * Background job handler for scanning uploaded file attachments for malware (ADR-015, LOS-1310).
 */
@Component
@JobHandlerFor(BackgroundJobKind.ATTACHMENT_SCAN)
public class AttachmentScanJobHandler implements JobHandler {

  private final AttachmentRepository attachmentRepository;
  private final AttachmentStoragePort storagePort;
  private final AttachmentScannerPort scannerPort;
  private final SecurityAuditPort securityAuditPort;
  private final Clock clock;
  private final ObjectMapper objectMapper;

  public AttachmentScanJobHandler(
      AttachmentRepository attachmentRepository,
      AttachmentStoragePort storagePort,
      AttachmentScannerPort scannerPort,
      SecurityAuditPort securityAuditPort,
      Clock clock) {
    this.attachmentRepository = attachmentRepository;
    this.storagePort = storagePort;
    this.scannerPort = scannerPort;
    this.securityAuditPort = securityAuditPort;
    this.clock = clock;
    this.objectMapper = new ObjectMapper();
  }

  @Override
  @Transactional
  public void execute(JobContext context) {
    UUID userId =
        context
            .userId()
            .orElseThrow(() -> new IllegalStateException("ATTACHMENT_SCAN job missing userId"));

    UUID attachmentId = parseAttachmentId(context.payload());
    Attachment attachment =
        attachmentRepository
            .findById(attachmentId)
            .orElseThrow(
                () -> new IllegalStateException("Attachment not found for scan: " + attachmentId));

    Instant now = clock.instant();

    try (InputStream stream = storagePort.loadObject(attachment.getStorageKey())) {
      AttachmentScannerPort.ScanResult scanResult = scannerPort.scanStream(stream);
      if (scanResult.clean()) {
        attachment.markClean(now);
        attachmentRepository.save(attachment);
        if (securityAuditPort != null) {
          securityAuditPort.record(
              new SecurityAuditCommand(
                  SecurityAuditEventType.ATTACHMENT_UPLOADED,
                  AuditOutcome.SUCCEEDED,
                  Optional.of(userId),
                  Optional.of(userId),
                  Optional.empty()));
        }
      } else {
        attachment.markQuarantined(scanResult.details(), now);
        attachmentRepository.save(attachment);
        if (securityAuditPort != null) {
          securityAuditPort.record(
              new SecurityAuditCommand(
                  SecurityAuditEventType.ATTACHMENT_QUARANTINED,
                  AuditOutcome.FAILED,
                  Optional.of(userId),
                  Optional.of(userId),
                  Optional.empty()));
        }
      }
    } catch (Exception e) {
      attachment.markQuarantined("Scan failed: " + e.getMessage(), now);
      attachmentRepository.save(attachment);
      if (securityAuditPort != null) {
        securityAuditPort.record(
            new SecurityAuditCommand(
                SecurityAuditEventType.ATTACHMENT_QUARANTINED,
                AuditOutcome.FAILED,
                Optional.of(userId),
                Optional.of(userId),
                Optional.empty()));
      }
    }
  }

  private UUID parseAttachmentId(String jsonPayload) {
    try {
      JsonNode node = objectMapper.readTree(jsonPayload);
      if (node.hasNonNull("attachmentId")) {
        return UUID.fromString(node.get("attachmentId").asText());
      }
      throw new IllegalArgumentException("Payload missing attachmentId: " + jsonPayload);
    } catch (IOException e) {
      throw new IllegalArgumentException("Malformed payload JSON: " + jsonPayload, e);
    }
  }
}
