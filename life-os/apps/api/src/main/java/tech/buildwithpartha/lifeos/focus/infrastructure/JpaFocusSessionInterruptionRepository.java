package tech.buildwithpartha.lifeos.focus.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionInterruption;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionInterruptionRepository;

/** JPA adapter for ownership-scoped Focus Session interruption persistence. */
@Repository
class JpaFocusSessionInterruptionRepository implements FocusSessionInterruptionRepository {

  private final FocusSessionInterruptionJpaRepository jpaRepository;

  JpaFocusSessionInterruptionRepository(FocusSessionInterruptionJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public FocusSessionInterruption save(FocusSessionInterruption interruption) {
    return jpaRepository
        .saveAndFlush(FocusSessionInterruptionEntity.fromDomain(interruption))
        .toDomain();
  }

  @Override
  public List<FocusSessionInterruption> findByFocusSessionIdAndUserId(
      UUID focusSessionId, UUID userId) {
    return jpaRepository
        .findByFocusSessionIdAndUserIdOrderByOccurredAtAsc(focusSessionId, userId)
        .stream()
        .map(FocusSessionInterruptionEntity::toDomain)
        .toList();
  }
}
