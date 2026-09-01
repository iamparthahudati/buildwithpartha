package tech.buildwithpartha.lifeos.attachment.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentStatus;

class AttachmentResponseTests {

  @Test
  @DisplayName("AttachmentResponse maps domain Attachment to DTO")
  void mapsDomainToResponse() {
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
            "file.pdf",
            "file.pdf",
            "application/pdf",
            100L,
            "key",
            now);

    AttachmentResponse response = AttachmentResponse.from(attachment);

    assertThat(response.id()).isEqualTo(id);
    assertThat(response.entityType()).isEqualTo(AttachmentEntityType.TASK);
    assertThat(response.entityId()).isEqualTo(entityId);
    assertThat(response.fileName()).isEqualTo("file.pdf");
    assertThat(response.sanitizedFileName()).isEqualTo("file.pdf");
    assertThat(response.contentType()).isEqualTo("application/pdf");
    assertThat(response.fileSizeBytes()).isEqualTo(100L);
    assertThat(response.status()).isEqualTo(AttachmentStatus.PENDING_SCAN);
    assertThat(response.scanResult()).isNull();
    assertThat(response.createdAt()).isEqualTo(now);
    assertThat(response.updatedAt()).isEqualTo(now);

    AttachmentListResponse listResponse = new AttachmentListResponse(List.of(response));
    assertThat(listResponse.items()).hasSize(1);
  }
}
