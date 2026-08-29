package tech.buildwithpartha.lifeos.common.activity;

import java.util.Optional;
import java.util.UUID;

/** Domain-neutral owner and current-link projection used by Activity reads. */
public interface ActivityObjectAccess {

  ActivitySubjectType objectType();

  boolean existsForUser(UUID userId, UUID objectId);

  Optional<ActivityObjectReference> findAvailable(UUID userId, UUID objectId);
}
