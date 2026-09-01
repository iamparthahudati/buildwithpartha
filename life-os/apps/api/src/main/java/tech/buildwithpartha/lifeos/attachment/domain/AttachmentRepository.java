package tech.buildwithpartha.lifeos.attachment.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Domain repository contract for managing attachment metadata (ADR-015). */
public interface AttachmentRepository {

  Attachment save(Attachment attachment);

  Optional<Attachment> findById(UUID id);

  List<Attachment> findByEntity(AttachmentEntityType entityType, UUID entityId);

  List<Attachment> findByUserId(UUID userId);

  long countByEntity(AttachmentEntityType entityType, UUID entityId);

  long sumFileSizeBytesByUserId(UUID userId);

  void deleteById(UUID id);
}
