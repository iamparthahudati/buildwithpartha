package tech.buildwithpartha.lifeos.attachment.application;

import java.io.InputStream;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentRepository;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentStatus;
import tech.buildwithpartha.lifeos.common.audit.AuditOutcome;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditCommand;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditEventType;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditPort;
import tech.buildwithpartha.lifeos.common.error.CodedException;
import tech.buildwithpartha.lifeos.common.error.ErrorCode;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;

/** Handles secure authenticated streaming downloads of clean attachment binaries (ADR-015). */
@Service
@Transactional(readOnly = true)
public class AttachmentDownloadService {

  public static final ErrorCode SCAN_PENDING = ErrorCode.of("ATTACHMENT_SCAN_PENDING");
  public static final ErrorCode QUARANTINED = ErrorCode.of("ATTACHMENT_QUARANTINED");

  private final AttachmentRepository attachmentRepository;
  private final AttachmentStoragePort storagePort;
  private final SecurityAuditPort securityAuditPort;

  public AttachmentDownloadService(
      AttachmentRepository attachmentRepository,
      AttachmentStoragePort storagePort,
      SecurityAuditPort securityAuditPort) {
    this.attachmentRepository = attachmentRepository;
    this.storagePort = storagePort;
    this.securityAuditPort = securityAuditPort;
  }

  public DownloadPayload openDownloadStream(UUID userId, UUID attachmentId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(attachmentId, "attachmentId must not be null");

    Attachment attachment =
        attachmentRepository
            .findById(attachmentId)
            .orElseThrow(
                () -> new ResourceNotFoundException("Attachment not found: " + attachmentId));

    if (!attachment.getUserId().equals(userId)
        || attachment.getStatus() == AttachmentStatus.DELETED) {
      throw new ResourceNotFoundException("Attachment not found: " + attachmentId);
    }

    if (attachment.getStatus() == AttachmentStatus.PENDING_SCAN) {
      throw new CodedException(
          SCAN_PENDING, "Attachment security scan is pending. Download locked.") {};
    }

    if (attachment.getStatus() == AttachmentStatus.QUARANTINED) {
      if (securityAuditPort != null) {
        securityAuditPort.record(
            new SecurityAuditCommand(
                SecurityAuditEventType.ATTACHMENT_QUARANTINED,
                AuditOutcome.DENIED,
                Optional.of(userId),
                Optional.of(userId),
                Optional.empty()));
      }
      throw new CodedException(
          QUARANTINED, "Attachment quarantined due to detected security risk.") {};
    }

    InputStream stream = storagePort.loadObject(attachment.getStorageKey());

    if (securityAuditPort != null) {
      securityAuditPort.record(
          new SecurityAuditCommand(
              SecurityAuditEventType.ATTACHMENT_DOWNLOADED,
              AuditOutcome.SUCCEEDED,
              Optional.of(userId),
              Optional.of(userId),
              Optional.empty()));
    }

    return new DownloadPayload(
        attachment.getSanitizedFileName(),
        attachment.getContentType(),
        attachment.getFileSizeBytes(),
        stream);
  }

  public record DownloadPayload(
      String fileName, String contentType, long fileSizeBytes, InputStream contentStream) {}
}
