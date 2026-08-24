package tech.buildwithpartha.lifeos.focus.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Persistence boundary for bounded Focus Session idempotency records. */
public interface FocusSessionOperationRepository {

  FocusSessionOperation save(FocusSessionOperation operation);

  Optional<FocusSessionOperation> findByUserIdAndIdempotencyKey(UUID userId, String idempotencyKey);

  long deleteCreatedBefore(Instant cutoff);
}
