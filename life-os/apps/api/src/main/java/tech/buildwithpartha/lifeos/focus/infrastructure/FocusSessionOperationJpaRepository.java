package tech.buildwithpartha.lifeos.focus.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface FocusSessionOperationJpaRepository
    extends JpaRepository<FocusSessionOperationEntity, UUID> {

  Optional<FocusSessionOperationEntity> findByUserIdAndIdempotencyKey(
      UUID userId, String idempotencyKey);

  long deleteByCreatedAtBefore(Instant cutoff);
}
