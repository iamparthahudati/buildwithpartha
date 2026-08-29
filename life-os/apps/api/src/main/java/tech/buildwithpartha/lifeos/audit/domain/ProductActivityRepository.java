package tech.buildwithpartha.lifeos.audit.domain;

import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;

/** Persistence boundary for product Activity Events. */
public interface ProductActivityRepository {

  ProductActivityEvent save(ProductActivityEvent event);

  List<ProductActivityEvent> findBySubject(
      UUID userId, ActivitySubjectType subjectType, UUID subjectId, int page, int size);

  long countBySubject(UUID userId, ActivitySubjectType subjectType, UUID subjectId);
}
