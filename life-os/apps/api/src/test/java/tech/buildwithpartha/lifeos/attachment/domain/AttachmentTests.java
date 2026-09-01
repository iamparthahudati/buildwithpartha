package tech.buildwithpartha.lifeos.attachment.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AttachmentTests {

  @Test
  @DisplayName("createPending initializes attachment in PENDING_SCAN state")
  void initializesPendingAttachment() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    UUID entityId = UUID.randomUUID();
    Instant now = Instant.now();

    Attachment attachment =
        Attachment.createPending(
            id,
            userId,
            AttachmentEntityType.TASK,
            entityId,
            "document.pdf",
            "document.pdf",
            "application/pdf",
            1024L,
            "attachments/" + userId + "/" + id,
            now);

    assertThat(attachment.getId()).isEqualTo(id);
    assertThat(attachment.getUserId()).isEqualTo(userId);
    assertThat(attachment.getEntityType()).isEqualTo(AttachmentEntityType.TASK);
    assertThat(attachment.getEntityId()).isEqualTo(entityId);
    assertThat(attachment.getStatus()).isEqualTo(AttachmentStatus.PENDING_SCAN);
    assertThat(attachment.getScanResult()).isNull();
  }

  @Test
  @DisplayName("markClean updates status to CLEAN")
  void transitionsToClean() {
    Instant now = Instant.now();
    Attachment attachment = createSampleAttachment(now);

    Instant updateTime = now.plusSeconds(10);
    attachment.markClean(updateTime);

    assertThat(attachment.getStatus()).isEqualTo(AttachmentStatus.CLEAN);
    assertThat(attachment.getScanResult()).isEqualTo("CLEAN");
    assertThat(attachment.getUpdatedAt()).isEqualTo(updateTime);
  }

  @Test
  @DisplayName("markQuarantined updates status to QUARANTINED")
  void transitionsToQuarantined() {
    Instant now = Instant.now();
    Attachment attachment = createSampleAttachment(now);

    Instant updateTime = now.plusSeconds(10);
    attachment.markQuarantined("EICAR_DETECTED", updateTime);

    assertThat(attachment.getStatus()).isEqualTo(AttachmentStatus.QUARANTINED);
    assertThat(attachment.getScanResult()).isEqualTo("EICAR_DETECTED");
    assertThat(attachment.getUpdatedAt()).isEqualTo(updateTime);
  }

  @Test
  @DisplayName("markDeleted updates status to DELETED with deletedAt timestamp")
  void transitionsToDeleted() {
    Instant now = Instant.now();
    Attachment attachment = createSampleAttachment(now);

    Instant deleteTime = now.plusSeconds(10);
    attachment.markDeleted(deleteTime);

    assertThat(attachment.getStatus()).isEqualTo(AttachmentStatus.DELETED);
    assertThat(attachment.getDeletedAt()).isEqualTo(deleteTime);
  }

  private Attachment createSampleAttachment(Instant now) {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    return Attachment.createPending(
        id,
        userId,
        AttachmentEntityType.PROJECT,
        UUID.randomUUID(),
        "file.txt",
        "file.txt",
        "text/plain",
        100L,
        "key",
        now);
  }
}
