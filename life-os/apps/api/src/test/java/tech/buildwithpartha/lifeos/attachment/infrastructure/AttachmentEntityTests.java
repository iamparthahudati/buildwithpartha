package tech.buildwithpartha.lifeos.attachment.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentStatus;

class AttachmentEntityTests {

  @Test
  @DisplayName("AttachmentEntity maps to and from domain Attachment aggregate")
  void roundTripsDomainConversion() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    UUID entityId = UUID.randomUUID();
    Instant now = Instant.now();

    Attachment domain =
        Attachment.createPending(
            id,
            userId,
            AttachmentEntityType.TASK,
            entityId,
            "file.txt",
            "file.txt",
            "text/plain",
            100L,
            "key",
            now);

    AttachmentEntity entity = AttachmentEntity.fromDomain(domain);

    assertThat(entity.getId()).isEqualTo(id);
    assertThat(entity.getUserId()).isEqualTo(userId);
    assertThat(entity.getEntityType()).isEqualTo(AttachmentEntityType.TASK);
    assertThat(entity.getEntityId()).isEqualTo(entityId);
    assertThat(entity.getFileName()).isEqualTo("file.txt");
    assertThat(entity.getSanitizedFileName()).isEqualTo("file.txt");
    assertThat(entity.getContentType()).isEqualTo("text/plain");
    assertThat(entity.getFileSizeBytes()).isEqualTo(100L);
    assertThat(entity.getStorageKey()).isEqualTo("key");
    assertThat(entity.getStatus()).isEqualTo(AttachmentStatus.PENDING_SCAN);
    assertThat(entity.getScanResult()).isNull();
    assertThat(entity.getCreatedAt()).isEqualTo(now);
    assertThat(entity.getUpdatedAt()).isEqualTo(now);
    assertThat(entity.getDeletedAt()).isNull();

    Attachment convertedBack = entity.toDomain();
    assertThat(convertedBack.getId()).isEqualTo(id);
    assertThat(convertedBack.getStatus()).isEqualTo(AttachmentStatus.PENDING_SCAN);
  }
}
