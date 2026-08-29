package tech.buildwithpartha.lifeos.audit.infrastructure;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;

interface ProductActivityEventJpaRepository
    extends JpaRepository<ProductActivityEventEntity, UUID> {

  Page<ProductActivityEventEntity>
      findByUserIdAndSubjectTypeAndSubjectIdOrderByOccurredAtDescIdDesc(
          UUID userId, ActivitySubjectType subjectType, UUID subjectId, Pageable pageable);

  long countByUserIdAndSubjectTypeAndSubjectId(
      UUID userId, ActivitySubjectType subjectType, UUID subjectId);
}
