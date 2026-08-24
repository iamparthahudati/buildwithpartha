package tech.buildwithpartha.lifeos.focus.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionOperation;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionOperationRepository;

/** JPA adapter for bounded Focus Session idempotency records. */
@Repository
class JpaFocusSessionOperationRepository implements FocusSessionOperationRepository {

  private final FocusSessionOperationJpaRepository jpaRepository;

  JpaFocusSessionOperationRepository(FocusSessionOperationJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public FocusSessionOperation save(FocusSessionOperation operation) {
    return jpaRepository.saveAndFlush(FocusSessionOperationEntity.fromDomain(operation)).toDomain();
  }

  @Override
  public Optional<FocusSessionOperation> findByUserIdAndIdempotencyKey(
      UUID userId, String idempotencyKey) {
    return jpaRepository
        .findByUserIdAndIdempotencyKey(userId, idempotencyKey)
        .map(FocusSessionOperationEntity::toDomain);
  }

  @Override
  public long deleteCreatedBefore(Instant cutoff) {
    return jpaRepository.deleteByCreatedAtBefore(cutoff);
  }
}
