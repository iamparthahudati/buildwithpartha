package tech.buildwithpartha.lifeos.attachment.application;

import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentMimeValidator;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentQuotas;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentRepository;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentStatus;
import tech.buildwithpartha.lifeos.common.audit.AuditOutcome;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditCommand;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditEventType;
import tech.buildwithpartha.lifeos.common.audit.SecurityAuditPort;
import tech.buildwithpartha.lifeos.common.error.CodedException;
import tech.buildwithpartha.lifeos.common.error.ErrorCode;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobPort;

/**
 * Core application service managing attachment metadata, uploads, quotas, and deletion (ADR-015).
 */
@Service
@Transactional
public class AttachmentService {

  private static final ErrorCode FILE_TOO_LARGE = ErrorCode.of("ATTACHMENT_FILE_TOO_LARGE");
  private static final ErrorCode ENTITY_LIMIT_EXCEEDED = ErrorCode.of("ATTACHMENT_LIMIT_EXCEEDED");
  private static final ErrorCode QUOTA_EXCEEDED = ErrorCode.of("ATTACHMENT_QUOTA_EXCEEDED");
  private static final ErrorCode UNSUPPORTED_TYPE = ErrorCode.of("ATTACHMENT_UNSUPPORTED_TYPE");
  private static final ErrorCode INVALID_MAGIC_BYTES =
      ErrorCode.of("ATTACHMENT_INVALID_MAGIC_BYTES");

  private final AttachmentRepository attachmentRepository;
  private final AttachmentStoragePort storagePort;
  private final BackgroundJobPort backgroundJobPort;
  private final SecurityAuditPort securityAuditPort;
  private final Clock clock;

  public AttachmentService(
      AttachmentRepository attachmentRepository,
      AttachmentStoragePort storagePort,
      BackgroundJobPort backgroundJobPort,
      SecurityAuditPort securityAuditPort,
      Clock clock) {
    this.attachmentRepository = attachmentRepository;
    this.storagePort = storagePort;
    this.backgroundJobPort = backgroundJobPort;
    this.securityAuditPort = securityAuditPort;
    this.clock = clock;
  }

  public Attachment uploadAttachment(
      UUID userId,
      AttachmentEntityType entityType,
      UUID entityId,
      String originalFilename,
      String contentType,
      byte[] contentBytes) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(entityType, "entityType must not be null");
    Objects.requireNonNull(entityId, "entityId must not be null");
    Objects.requireNonNull(contentBytes, "contentBytes must not be null");

    // 1. Quota & size checks
    long size = contentBytes.length;
    if (size > AttachmentQuotas.MAX_FILE_SIZE_BYTES) {
      throw new CodedException(FILE_TOO_LARGE, "File size exceeds maximum limit of 25MB.") {};
    }

    long entityCount = attachmentRepository.countByEntity(entityType, entityId);
    if (entityCount >= AttachmentQuotas.MAX_PER_ENTITY_ATTACHMENTS) {
      throw new CodedException(
          ENTITY_LIMIT_EXCEEDED, "Maximum limit of 20 attachments per entity reached.") {};
    }

    long currentUsage = attachmentRepository.sumFileSizeBytesByUserId(userId);
    if (currentUsage + size > AttachmentQuotas.MAX_ACCOUNT_STORAGE_BYTES) {
      throw new CodedException(
          QUOTA_EXCEEDED, "Account attachment storage quota of 2GB exceeded.") {};
    }

    // 2. MIME & Extension validation
    if (!AttachmentMimeValidator.isAllowedMimeType(contentType)
        || AttachmentMimeValidator.isForbiddenFilename(originalFilename)) {
      throw new CodedException(
          UNSUPPORTED_TYPE, "File MIME type or extension is not permitted.") {};
    }

    // 3. Magic-byte inspection
    byte[] header = new byte[Math.min(contentBytes.length, 32)];
    System.arraycopy(contentBytes, 0, header, 0, header.length);
    if (!AttachmentMimeValidator.validateMagicBytes(contentType, header)) {
      throw new CodedException(
          INVALID_MAGIC_BYTES, "File binary content header does not match claimed MIME type.") {};
    }

    // 4. Save object to S3 storage
    UUID attachmentId = UUID.randomUUID();
    String storageKey = "attachments/" + userId + "/" + attachmentId;
    String sanitizedFilename = AttachmentMimeValidator.sanitizeFilename(originalFilename);
    Instant now = clock.instant();

    storagePort.storeObject(storageKey, new ByteArrayInputStream(contentBytes), size, contentType);

    // 5. Save attachment metadata in DB (PENDING_SCAN)
    Attachment attachment =
        Attachment.createPending(
            attachmentId,
            userId,
            entityType,
            entityId,
            originalFilename,
            sanitizedFilename,
            contentType,
            size,
            storageKey,
            now);

    Attachment saved = attachmentRepository.save(attachment);

    // 6. Enqueue asynchronous virus scan job
    String payload = String.format("{\"attachmentId\":\"%s\"}", attachmentId);
    backgroundJobPort.enqueue(userId, BackgroundJobKind.ATTACHMENT_SCAN, payload);

    // 7. Audit logging
    if (securityAuditPort != null) {
      securityAuditPort.record(
          new SecurityAuditCommand(
              SecurityAuditEventType.ATTACHMENT_UPLOADED,
              AuditOutcome.SUCCEEDED,
              Optional.of(userId),
              Optional.of(userId),
              Optional.empty()));
    }

    return saved;
  }

  @Transactional(readOnly = true)
  public List<Attachment> getEntityAttachments(
      UUID userId, AttachmentEntityType entityType, UUID entityId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(entityType, "entityType must not be null");
    Objects.requireNonNull(entityId, "entityId must not be null");

    return attachmentRepository.findByEntity(entityType, entityId).stream()
        .filter(a -> a.getUserId().equals(userId) && a.getStatus() != AttachmentStatus.DELETED)
        .toList();
  }

  @Transactional(readOnly = true)
  public Attachment getAttachment(UUID userId, UUID attachmentId) {
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

    return attachment;
  }

  public void deleteAttachment(UUID userId, UUID attachmentId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(attachmentId, "attachmentId must not be null");

    Attachment attachment = getAttachment(userId, attachmentId);
    Instant now = clock.instant();
    attachment.markDeleted(now);
    attachmentRepository.save(attachment);

    try {
      storagePort.deleteObject(attachment.getStorageKey());
    } catch (Exception ignored) {
      // Storage object deletion failure logged silently; metadata soft-deleted
    }

    if (securityAuditPort != null) {
      securityAuditPort.record(
          new SecurityAuditCommand(
              SecurityAuditEventType.RECORD_DELETED,
              AuditOutcome.SUCCEEDED,
              Optional.of(userId),
              Optional.of(userId),
              Optional.empty()));
    }
  }
}
