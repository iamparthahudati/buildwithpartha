package tech.buildwithpartha.lifeos.attachment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.attachment.application.AttachmentDownloadService.DownloadPayload;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentRepository;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentStatus;
import tech.buildwithpartha.lifeos.common.error.CodedException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;

class AttachmentDownloadServiceTests {

  private TestAttachmentRepository attachmentRepository;
  private TestStoragePort storagePort;
  private AttachmentDownloadService service;

  private static final UUID USER_ID = UUID.randomUUID();
  private static final UUID ATTACHMENT_ID = UUID.randomUUID();
  private static final Instant NOW = Instant.parse("2026-09-01T12:00:00Z");

  @BeforeEach
  void setUp() {
    attachmentRepository = new TestAttachmentRepository();
    storagePort = new TestStoragePort();

    service = new AttachmentDownloadService(attachmentRepository, storagePort, null);
  }

  @Test
  @DisplayName("openDownloadStream streams binary content when attachment status is CLEAN")
  void downloadsCleanAttachment() {
    Attachment attachment = createAttachment(AttachmentStatus.CLEAN);
    attachmentRepository.save(attachment);
    storagePort.payload = "Hello World".getBytes(StandardCharsets.UTF_8);

    DownloadPayload payload = service.openDownloadStream(USER_ID, ATTACHMENT_ID);

    assertThat(payload).isNotNull();
    assertThat(payload.fileName()).isEqualTo("doc.pdf");
    assertThat(payload.contentType()).isEqualTo("application/pdf");
    assertThat(payload.contentStream()).isNotNull();
  }

  @Test
  @DisplayName("openDownloadStream throws SCAN_PENDING exception when scan is in progress")
  void locksPendingScanAttachment() {
    Attachment attachment = createAttachment(AttachmentStatus.PENDING_SCAN);
    attachmentRepository.save(attachment);

    assertThatThrownBy(() -> service.openDownloadStream(USER_ID, ATTACHMENT_ID))
        .isInstanceOf(CodedException.class)
        .hasMessageContaining("scan is pending");
  }

  @Test
  @DisplayName("openDownloadStream throws QUARANTINED exception when virus detected")
  void forbidsQuarantinedAttachment() {
    Attachment attachment = createAttachment(AttachmentStatus.QUARANTINED);
    attachmentRepository.save(attachment);

    assertThatThrownBy(() -> service.openDownloadStream(USER_ID, ATTACHMENT_ID))
        .isInstanceOf(CodedException.class)
        .hasMessageContaining("quarantined");
  }

  @Test
  @DisplayName("openDownloadStream throws ResourceNotFoundException for unauthorized user")
  void rejectsUnauthorizedUser() {
    Attachment attachment = createAttachment(AttachmentStatus.CLEAN);
    attachmentRepository.save(attachment);

    UUID strangerId = UUID.randomUUID();
    assertThatThrownBy(() -> service.openDownloadStream(strangerId, ATTACHMENT_ID))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("openDownloadStream throws ResourceNotFoundException for deleted attachment")
  void rejectsDeletedAttachment() {
    Attachment attachment = createAttachment(AttachmentStatus.CLEAN);
    attachment.markDeleted(NOW);
    attachmentRepository.save(attachment);

    assertThatThrownBy(() -> service.openDownloadStream(USER_ID, ATTACHMENT_ID))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("openDownloadStream records security audit events when securityAuditPort is present")
  void recordsAuditEvents() {
    TestAuditPort auditPort = new TestAuditPort();
    AttachmentDownloadService auditDownloadService =
        new AttachmentDownloadService(attachmentRepository, storagePort, auditPort);

    Attachment cleanAtt = createAttachment(AttachmentStatus.CLEAN);
    attachmentRepository.save(cleanAtt);
    auditDownloadService.openDownloadStream(USER_ID, ATTACHMENT_ID);
    assertThat(auditPort.recordedCommands).hasSize(1);

    Attachment quarantinedAtt = createAttachment(AttachmentStatus.QUARANTINED);
    attachmentRepository.save(quarantinedAtt);
    assertThatThrownBy(() -> auditDownloadService.openDownloadStream(USER_ID, ATTACHMENT_ID))
        .isInstanceOf(CodedException.class);
    assertThat(auditPort.recordedCommands).hasSize(2);
  }

  private static class TestAuditPort
      implements tech.buildwithpartha.lifeos.common.audit.SecurityAuditPort {
    final List<tech.buildwithpartha.lifeos.common.audit.SecurityAuditCommand> recordedCommands =
        new ArrayList<>();

    @Override
    public void record(tech.buildwithpartha.lifeos.common.audit.SecurityAuditCommand command) {
      recordedCommands.add(command);
    }
  }

  private Attachment createAttachment(AttachmentStatus status) {
    Attachment attachment =
        Attachment.createPending(
            ATTACHMENT_ID,
            USER_ID,
            AttachmentEntityType.TASK,
            UUID.randomUUID(),
            "doc.pdf",
            "doc.pdf",
            "application/pdf",
            100L,
            "key",
            NOW);
    if (status == AttachmentStatus.CLEAN) {
      attachment.markClean(NOW);
    } else if (status == AttachmentStatus.QUARANTINED) {
      attachment.markQuarantined("MALWARE_DETECTED", NOW);
    }
    return attachment;
  }

  private static class TestAttachmentRepository implements AttachmentRepository {
    private final List<Attachment> items = new ArrayList<>();

    @Override
    public Attachment save(Attachment attachment) {
      items.removeIf(i -> i.getId().equals(attachment.getId()));
      items.add(attachment);
      return attachment;
    }

    @Override
    public Optional<Attachment> findById(UUID id) {
      return items.stream().filter(i -> i.getId().equals(id)).findFirst();
    }

    @Override
    public List<Attachment> findByEntity(AttachmentEntityType entityType, UUID entityId) {
      return items;
    }

    @Override
    public List<Attachment> findByUserId(UUID userId) {
      return items;
    }

    @Override
    public long countByEntity(AttachmentEntityType entityType, UUID entityId) {
      return items.size();
    }

    @Override
    public long sumFileSizeBytesByUserId(UUID userId) {
      return 0;
    }

    @Override
    public void deleteById(UUID id) {
      items.removeIf(i -> i.getId().equals(id));
    }
  }

  private static class TestStoragePort implements AttachmentStoragePort {
    byte[] payload = new byte[0];

    @Override
    public void storeObject(String key, InputStream inputStream, long length, String contentType) {}

    @Override
    public InputStream loadObject(String key) {
      return new ByteArrayInputStream(payload);
    }

    @Override
    public void deleteObject(String key) {}

    @Override
    public boolean existsObject(String key) {
      return true;
    }
  }
}
