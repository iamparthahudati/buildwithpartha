package tech.buildwithpartha.lifeos.attachment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.InputStream;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentQuotas;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentRepository;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentStatus;
import tech.buildwithpartha.lifeos.common.error.CodedException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobPort;

class AttachmentServiceTests {

  private TestAttachmentRepository attachmentRepository;
  private TestStoragePort storagePort;
  private TestJobPort jobPort;
  private AttachmentService service;

  private static final UUID USER_ID = UUID.randomUUID();
  private static final UUID ENTITY_ID = UUID.randomUUID();
  private static final Instant NOW = Instant.parse("2026-09-01T12:00:00Z");

  @BeforeEach
  void setUp() {
    attachmentRepository = new TestAttachmentRepository();
    storagePort = new TestStoragePort();
    jobPort = new TestJobPort();
    Clock fixedClock = Clock.fixed(NOW, ZoneId.of("UTC"));

    service = new AttachmentService(attachmentRepository, storagePort, jobPort, null, fixedClock);
  }

  @Test
  @DisplayName("uploadAttachment validates header and saves metadata and enqueues scan job")
  void successfulUpload() {
    byte[] pdfBytes = new byte[] {0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34}; // %PDF-1.4

    Attachment attachment =
        service.uploadAttachment(
            USER_ID, AttachmentEntityType.TASK, ENTITY_ID, "spec.pdf", "application/pdf", pdfBytes);

    assertThat(attachment).isNotNull();
    assertThat(attachment.getStatus()).isEqualTo(AttachmentStatus.PENDING_SCAN);
    assertThat(attachment.getFileName()).isEqualTo("spec.pdf");
    assertThat(storagePort.storedKeys).contains(attachment.getStorageKey());
    assertThat(jobPort.enqueuedJobs).hasSize(1);
    assertThat(jobPort.enqueuedJobs.get(0).kind()).isEqualTo(BackgroundJobKind.ATTACHMENT_SCAN);
  }

  @Test
  @DisplayName("uploadAttachment rejects files exceeding 25MB limit")
  void rejectsFileExceedingMaxSize() {
    byte[] oversized = new byte[(int) AttachmentQuotas.MAX_FILE_SIZE_BYTES + 10];

    assertThatThrownBy(
            () ->
                service.uploadAttachment(
                    USER_ID,
                    AttachmentEntityType.TASK,
                    ENTITY_ID,
                    "big.pdf",
                    "application/pdf",
                    oversized))
        .isInstanceOf(CodedException.class)
        .hasMessageContaining("25MB");
  }

  @Test
  @DisplayName("uploadAttachment rejects uploads exceeding entity attachment limit of 20")
  void rejectsExcessiveEntityAttachments() {
    attachmentRepository.entityCount = 20;
    byte[] pdfBytes = new byte[] {0x25, 0x50, 0x44, 0x46};

    assertThatThrownBy(
            () ->
                service.uploadAttachment(
                    USER_ID,
                    AttachmentEntityType.TASK,
                    ENTITY_ID,
                    "doc.pdf",
                    "application/pdf",
                    pdfBytes))
        .isInstanceOf(CodedException.class)
        .hasMessageContaining("20 attachments");
  }

  @Test
  @DisplayName("uploadAttachment rejects uploads exceeding account 2GB quota")
  void rejectsAccountQuotaExceeded() {
    attachmentRepository.accountUsage = AttachmentQuotas.MAX_ACCOUNT_STORAGE_BYTES;
    byte[] pdfBytes = new byte[] {0x25, 0x50, 0x44, 0x46};

    assertThatThrownBy(
            () ->
                service.uploadAttachment(
                    USER_ID,
                    AttachmentEntityType.TASK,
                    ENTITY_ID,
                    "doc.pdf",
                    "application/pdf",
                    pdfBytes))
        .isInstanceOf(CodedException.class)
        .hasMessageContaining("2GB");
  }

  @Test
  @DisplayName("uploadAttachment rejects forbidden file extensions and MIME types")
  void rejectsForbiddenTypes() {
    byte[] pdfHeader = new byte[] {0x25, 0x50, 0x44, 0x46};

    assertThatThrownBy(
            () ->
                service.uploadAttachment(
                    USER_ID,
                    AttachmentEntityType.TASK,
                    ENTITY_ID,
                    "script.exe",
                    "application/pdf",
                    pdfHeader))
        .isInstanceOf(CodedException.class)
        .hasMessageContaining("not permitted");

    assertThatThrownBy(
            () ->
                service.uploadAttachment(
                    USER_ID,
                    AttachmentEntityType.TASK,
                    ENTITY_ID,
                    "document.pdf",
                    "text/html",
                    pdfHeader))
        .isInstanceOf(CodedException.class)
        .hasMessageContaining("not permitted");
  }

  @Test
  @DisplayName("uploadAttachment rejects payloads failing magic-byte header check")
  void rejectsMagicByteMismatch() {
    byte[] fakePdfBytes = new byte[] {0x00, 0x00, 0x00, 0x00}; // Not %PDF

    assertThatThrownBy(
            () ->
                service.uploadAttachment(
                    USER_ID,
                    AttachmentEntityType.TASK,
                    ENTITY_ID,
                    "fake.pdf",
                    "application/pdf",
                    fakePdfBytes))
        .isInstanceOf(CodedException.class)
        .hasMessageContaining("header does not match");
  }

  @Test
  @DisplayName("getAttachment verifies user ownership and non-deleted state")
  void getAttachmentAuthorization() {
    UUID id = UUID.randomUUID();
    Attachment attachment =
        Attachment.createPending(
            id,
            USER_ID,
            AttachmentEntityType.TASK,
            ENTITY_ID,
            "test.pdf",
            "test.pdf",
            "application/pdf",
            100L,
            "key",
            NOW);
    attachmentRepository.save(attachment);

    assertThat(service.getAttachment(USER_ID, id)).isNotNull();

    UUID otherUser = UUID.randomUUID();
    assertThatThrownBy(() -> service.getAttachment(otherUser, id))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("deleteAttachment soft deletes metadata and purges storage object")
  void deleteAttachmentSuccess() {
    UUID id = UUID.randomUUID();
    Attachment attachment =
        Attachment.createPending(
            id,
            USER_ID,
            AttachmentEntityType.TASK,
            ENTITY_ID,
            "test.pdf",
            "test.pdf",
            "application/pdf",
            100L,
            "key",
            NOW);
    attachmentRepository.save(attachment);

    service.deleteAttachment(USER_ID, id);

    Attachment updated = attachmentRepository.findById(id).orElseThrow();
    assertThat(updated.getStatus()).isEqualTo(AttachmentStatus.DELETED);
  }

  @Test
  @DisplayName("deleteAttachment handles storage deletion exception gracefully")
  void deleteAttachmentStorageException() {
    UUID id = UUID.randomUUID();
    Attachment attachment =
        Attachment.createPending(
            id,
            USER_ID,
            AttachmentEntityType.TASK,
            ENTITY_ID,
            "test.pdf",
            "test.pdf",
            "application/pdf",
            100L,
            "key",
            NOW);
    attachmentRepository.save(attachment);
    storagePort.throwException = true;

    service.deleteAttachment(USER_ID, id);

    Attachment updated = attachmentRepository.findById(id).orElseThrow();
    assertThat(updated.getStatus()).isEqualTo(AttachmentStatus.DELETED);
  }

  @Test
  @DisplayName("getAttachment rejects deleted attachments")
  void getAttachmentDeleted() {
    UUID id = UUID.randomUUID();
    Attachment attachment =
        Attachment.createPending(
            id,
            USER_ID,
            AttachmentEntityType.TASK,
            ENTITY_ID,
            "test.pdf",
            "test.pdf",
            "application/pdf",
            100L,
            "key",
            NOW);
    attachment.markDeleted(NOW);
    attachmentRepository.save(attachment);

    assertThatThrownBy(() -> service.getAttachment(USER_ID, id))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("getEntityAttachments filters out deleted attachments and other users")
  void getEntityAttachmentsFiltering() {
    UUID id1 = UUID.randomUUID();
    Attachment active =
        Attachment.createPending(
            id1,
            USER_ID,
            AttachmentEntityType.TASK,
            ENTITY_ID,
            "active.pdf",
            "active.pdf",
            "application/pdf",
            100L,
            "key1",
            NOW);

    UUID id2 = UUID.randomUUID();
    Attachment deleted =
        Attachment.createPending(
            id2,
            USER_ID,
            AttachmentEntityType.TASK,
            ENTITY_ID,
            "deleted.pdf",
            "deleted.pdf",
            "application/pdf",
            100L,
            "key2",
            NOW);
    deleted.markDeleted(NOW);

    UUID id3 = UUID.randomUUID();
    Attachment otherUser =
        Attachment.createPending(
            id3,
            UUID.randomUUID(),
            AttachmentEntityType.TASK,
            ENTITY_ID,
            "other.pdf",
            "other.pdf",
            "application/pdf",
            100L,
            "key3",
            NOW);

    attachmentRepository.save(active);
    attachmentRepository.save(deleted);
    attachmentRepository.save(otherUser);

    List<Attachment> results =
        service.getEntityAttachments(USER_ID, AttachmentEntityType.TASK, ENTITY_ID);
    assertThat(results).extracting(Attachment::getId).containsExactly(id1);
  }

  @Test
  @DisplayName("AttachmentService executes with non-null SecurityAuditPort")
  void executesWithAuditPort() {
    TestAuditPort auditPort = new TestAuditPort();
    AttachmentService auditService =
        new AttachmentService(
            attachmentRepository,
            storagePort,
            jobPort,
            auditPort,
            Clock.fixed(NOW, ZoneId.of("UTC")));

    byte[] pdfBytes = new byte[] {0x25, 0x50, 0x44, 0x46};
    Attachment created =
        auditService.uploadAttachment(
            USER_ID,
            AttachmentEntityType.TASK,
            ENTITY_ID,
            "audit.pdf",
            "application/pdf",
            pdfBytes);

    auditService.deleteAttachment(USER_ID, created.getId());
    assertThat(auditPort.recordedCommands).hasSize(2);
  }

  private static class TestAttachmentRepository implements AttachmentRepository {
    private final List<Attachment> items = new ArrayList<>();
    long entityCount = 0;
    long accountUsage = 0;

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
      return items.stream()
          .filter(i -> i.getEntityType() == entityType && i.getEntityId().equals(entityId))
          .toList();
    }

    @Override
    public List<Attachment> findByUserId(UUID userId) {
      return items.stream().filter(i -> i.getUserId().equals(userId)).toList();
    }

    @Override
    public long countByEntity(AttachmentEntityType entityType, UUID entityId) {
      return entityCount;
    }

    @Override
    public long sumFileSizeBytesByUserId(UUID userId) {
      return accountUsage;
    }

    @Override
    public void deleteById(UUID id) {
      items.removeIf(i -> i.getId().equals(id));
    }
  }

  private static class TestStoragePort implements AttachmentStoragePort {
    final List<String> storedKeys = new ArrayList<>();
    boolean throwException = false;

    @Override
    public void storeObject(String key, InputStream inputStream, long length, String contentType) {
      storedKeys.add(key);
    }

    @Override
    public InputStream loadObject(String key) {
      return InputStream.nullInputStream();
    }

    @Override
    public void deleteObject(String key) {
      if (throwException) {
        throw new RuntimeException("Storage delete error");
      }
      storedKeys.remove(key);
    }

    @Override
    public boolean existsObject(String key) {
      return storedKeys.contains(key);
    }
  }

  private static class TestJobPort implements BackgroundJobPort {
    record EnqueuedJob(UUID userId, BackgroundJobKind kind, String payload) {}

    final List<EnqueuedJob> enqueuedJobs = new ArrayList<>();

    @Override
    public UUID enqueue(UUID userId, BackgroundJobKind kind, String jsonPayload) {
      enqueuedJobs.add(new EnqueuedJob(userId, kind, jsonPayload));
      return UUID.randomUUID();
    }
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
}
