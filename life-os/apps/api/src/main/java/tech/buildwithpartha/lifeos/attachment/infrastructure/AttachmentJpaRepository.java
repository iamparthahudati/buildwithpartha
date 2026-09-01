package tech.buildwithpartha.lifeos.attachment.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentStatus;

/** Spring Data JPA repository for public.attachments table. */
public interface AttachmentJpaRepository extends JpaRepository<AttachmentEntity, UUID> {

  List<AttachmentEntity> findByEntityTypeAndEntityId(
      AttachmentEntityType entityType, UUID entityId);

  List<AttachmentEntity> findByUserId(UUID userId);

  long countByEntityTypeAndEntityIdAndStatusNot(
      AttachmentEntityType entityType, UUID entityId, AttachmentStatus status);

  @Query(
      "SELECT COALESCE(SUM(a.fileSizeBytes), 0) FROM AttachmentEntity a"
          + " WHERE a.userId = :userId AND a.status <> 'DELETED'")
  long sumFileSizeBytesByUserId(@Param("userId") UUID userId);
}
