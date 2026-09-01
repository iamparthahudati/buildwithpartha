package tech.buildwithpartha.lifeos.attachment.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaAttachmentRepositoryTests {

  @Autowired private AttachmentJpaRepository jpaRepository;
  private JpaAttachmentRepository repository;

  @BeforeEach
  void setUp() {
    jpaRepository.deleteAll();
    repository = new JpaAttachmentRepository(jpaRepository);
  }

  @Test
  @DisplayName("JpaAttachmentRepository persists, queries, counts, and sums file size")
  void testJpaAttachmentRepositoryOperations() {
    UUID userId = UUID.randomUUID();
    UUID entityId = UUID.randomUUID();
    Instant now = Instant.now();

    Attachment att1 =
        Attachment.createPending(
            UUID.randomUUID(),
            userId,
            AttachmentEntityType.TASK,
            entityId,
            "doc1.pdf",
            "doc1.pdf",
            "application/pdf",
            500L,
            "key1",
            now);

    Attachment att2 =
        Attachment.createPending(
            UUID.randomUUID(),
            userId,
            AttachmentEntityType.TASK,
            entityId,
            "doc2.pdf",
            "doc2.pdf",
            "application/pdf",
            1500L,
            "key2",
            now);

    Attachment deleted =
        Attachment.createPending(
            UUID.randomUUID(),
            userId,
            AttachmentEntityType.TASK,
            entityId,
            "deleted.pdf",
            "deleted.pdf",
            "application/pdf",
            3000L,
            "key3",
            now);
    deleted.markDeleted(now);

    repository.save(att1);
    repository.save(att2);
    repository.save(deleted);

    assertThat(repository.findById(att1.getId())).isPresent();

    List<Attachment> entityAttachments =
        repository.findByEntity(AttachmentEntityType.TASK, entityId);
    assertThat(entityAttachments).hasSize(3);

    List<Attachment> userAttachments = repository.findByUserId(userId);
    assertThat(userAttachments).hasSize(3);

    assertThat(repository.countByEntity(AttachmentEntityType.TASK, entityId)).isEqualTo(2);

    assertThat(repository.sumFileSizeBytesByUserId(userId)).isEqualTo(2000L);

    repository.deleteById(att1.getId());
    assertThat(repository.findById(att1.getId())).isEmpty();
  }
}
