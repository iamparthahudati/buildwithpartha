package tech.buildwithpartha.lifeos.common.activity;

import java.util.UUID;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;

/** Cross-domain boundary for recording and reading user-scoped product Activity Events. */
public interface ProductActivityPort {

  ProductActivityRecord record(ProductActivityCommand command);

  PageResponse<ProductActivityRecord> findBySubject(
      UUID userId, ActivitySubjectType subjectType, UUID subjectId, int page, int size);

  long countBySubject(UUID userId, ActivitySubjectType subjectType, UUID subjectId);
}
