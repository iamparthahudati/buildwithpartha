package tech.buildwithpartha.lifeos.attachment.application;

import static org.assertj.core.api.Assertions.assertThat;

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
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentRepository;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentStatus;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.JobHandler.JobContext;

class AttachmentScanJobHandlerTests {

  private TestAttachmentRepository attachmentRepository;
  private TestStoragePort storagePort;
  private TestScannerPort scannerPort;
  private AttachmentScanJobHandler jobHandler;

  private static final UUID USER_ID = UUID.randomUUID();
  private static final UUID ATTACHMENT_ID = UUID.randomUUID();
  private static final Instant NOW = Instant.parse("2026-09-01T12:00:00Z");

  @BeforeEach
  void setUp() {
    attachmentRepository = new TestAttachmentRepository();
    storagePort = new TestStoragePort();
    scannerPort = new TestScannerPort();
    Clock fixedClock = Clock.fixed(NOW, ZoneId.of("UTC"));

    jobHandler =
        new AttachmentScanJobHandler(
            attachmentRepository, storagePort, scannerPort, null, fixedClock);
  }

  @Test
  @DisplayName("execute transitions attachment to CLEAN when scan result is clean")
  void scansCleanAttachment() {
    Attachment attachment = createPendingAttachment();
    attachmentRepository.save(attachment);
    scannerPort.clean = true;

    JobContext context =
        new JobContext(
            UUID.randomUUID(),
            Optional.of(USER_ID),
            BackgroundJobKind.ATTACHMENT_SCAN,
            String.format("{\"attachmentId\":\"%s\"}", ATTACHMENT_ID),
            NOW);

    jobHandler.execute(context);

    Attachment updated = attachmentRepository.findById(ATTACHMENT_ID).orElseThrow();
    assertThat(updated.getStatus()).isEqualTo(AttachmentStatus.CLEAN);
    assertThat(updated.getScanResult()).isEqualTo("CLEAN");
  }

  @Test
  @DisplayName("execute transitions attachment to QUARANTINED when malware is detected")
  void scansMalwareAttachment() {
    Attachment attachment = createPendingAttachment();
    attachmentRepository.save(attachment);
    scannerPort.clean = false;
    scannerPort.details = "EICAR-SIGNATURE_DETECTED";

    JobContext context =
        new JobContext(
            UUID.randomUUID(),
            Optional.of(USER_ID),
            BackgroundJobKind.ATTACHMENT_SCAN,
            String.format("{\"attachmentId\":\"%s\"}", ATTACHMENT_ID),
            NOW);

    jobHandler.execute(context);

    Attachment updated = attachmentRepository.findById(ATTACHMENT_ID).orElseThrow();
    assertThat(updated.getStatus()).isEqualTo(AttachmentStatus.QUARANTINED);
    assertThat(updated.getScanResult()).isEqualTo("EICAR-SIGNATURE_DETECTED");
  }

  @Test
  @DisplayName("execute quarantines attachment when scan throws exception")
  void quarantinesAttachmentOnException() {
    Attachment attachment = createPendingAttachment();
    attachmentRepository.save(attachment);
    scannerPort.throwException = true;

    JobContext context =
        new JobContext(
            UUID.randomUUID(),
            Optional.of(USER_ID),
            BackgroundJobKind.ATTACHMENT_SCAN,
            String.format("{\"attachmentId\":\"%s\"}", ATTACHMENT_ID),
            NOW);

    jobHandler.execute(context);

    Attachment updated = attachmentRepository.findById(ATTACHMENT_ID).orElseThrow();
    assertThat(updated.getStatus()).isEqualTo(AttachmentStatus.QUARANTINED);
    assertThat(updated.getScanResult()).contains("Scan failed");
  }

  @Test
  @DisplayName("execute throws IllegalArgumentException on malformed payload")
  void rejectsMalformedPayload() {
    JobContext invalidContext =
        new JobContext(
            UUID.randomUUID(),
            Optional.of(USER_ID),
            BackgroundJobKind.ATTACHMENT_SCAN,
            "invalid-json",
            NOW);

    org.assertj.core.api.Assertions.assertThatThrownBy(() -> jobHandler.execute(invalidContext))
        .isInstanceOf(IllegalArgumentException.class);
  }

  private Attachment createPendingAttachment() {
    return Attachment.createPending(
        ATTACHMENT_ID,
        USER_ID,
        AttachmentEntityType.TASK,
        UUID.randomUUID(),
        "file.pdf",
        "file.pdf",
        "application/pdf",
        100L,
        "key",
        NOW);
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
    @Override
    public void storeObject(String key, InputStream inputStream, long length, String contentType) {}

    @Override
    public InputStream loadObject(String key) {
      return InputStream.nullInputStream();
    }

    @Override
    public void deleteObject(String key) {}

    @Override
    public boolean existsObject(String key) {
      return true;
    }
  }

  private static class TestScannerPort implements AttachmentScannerPort {
    boolean clean = true;
    String details = "CLEAN";
    boolean throwException = false;

    @Override
    public ScanResult scanStream(InputStream inputStream) {
      if (throwException) {
        throw new RuntimeException("Scanner connection reset");
      }
      return new ScanResult(clean, details);
    }
  }
}
