package tech.buildwithpartha.lifeos.attachment.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentRepository;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentStatus;

/** JPA persistence adapter implementing AttachmentRepository contract (ADR-015). */
@Repository
public class JpaAttachmentRepository implements AttachmentRepository {

  private final AttachmentJpaRepository jpaRepository;

  public JpaAttachmentRepository(AttachmentJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public Attachment save(Attachment attachment) {
    AttachmentEntity entity = AttachmentEntity.fromDomain(attachment);
    return jpaRepository.save(entity).toDomain();
  }

  @Override
  public Optional<Attachment> findById(UUID id) {
    return jpaRepository.findById(id).map(AttachmentEntity::toDomain);
  }

  @Override
  public List<Attachment> findByEntity(AttachmentEntityType entityType, UUID entityId) {
    return jpaRepository.findByEntityTypeAndEntityId(entityType, entityId).stream()
        .map(AttachmentEntity::toDomain)
        .toList();
  }

  @Override
  public List<Attachment> findByUserId(UUID userId) {
    return jpaRepository.findByUserId(userId).stream().map(AttachmentEntity::toDomain).toList();
  }

  @Override
  public long countByEntity(AttachmentEntityType entityType, UUID entityId) {
    return jpaRepository.countByEntityTypeAndEntityIdAndStatusNot(
        entityType, entityId, AttachmentStatus.DELETED);
  }

  @Override
  public long sumFileSizeBytesByUserId(UUID userId) {
    return jpaRepository.sumFileSizeBytesByUserId(userId);
  }

  @Override
  public void deleteById(UUID id) {
    jpaRepository.deleteById(id);
  }
}
