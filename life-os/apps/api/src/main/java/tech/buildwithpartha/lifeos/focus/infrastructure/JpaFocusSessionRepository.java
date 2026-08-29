package tech.buildwithpartha.lifeos.focus.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionRepository;

/** JPA adapter for ownership-scoped Focus Session persistence. */
@Repository
class JpaFocusSessionRepository implements FocusSessionRepository {

  private final FocusSessionJpaRepository jpaRepository;

  JpaFocusSessionRepository(FocusSessionJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public void lockUser(UUID userId) {
    if (jpaRepository.lockUserById(userId) == null) {
      throw new IllegalArgumentException("userId must identify an existing Account");
    }
  }

  @Override
  public FocusSession save(FocusSession session) {
    return jpaRepository.saveAndFlush(FocusSessionEntity.fromDomain(session)).toDomain();
  }

  @Override
  public Optional<FocusSession> findByIdAndUserId(UUID id, UUID userId) {
    return jpaRepository.findByIdAndUserId(id, userId).map(FocusSessionEntity::toDomain);
  }

  @Override
  public Optional<FocusSession> findActiveByUserId(UUID userId) {
    return jpaRepository.findActiveByUserId(userId).map(FocusSessionEntity::toDomain);
  }

  @Override
  public List<FocusSession> findByUserIdAndStartedAtBetween(
      UUID userId, Instant rangeStart, Instant rangeEnd) {
    if (!rangeEnd.isAfter(rangeStart)) {
      throw new IllegalArgumentException("rangeEnd must be after rangeStart");
    }
    return jpaRepository
        .findByUserIdAndStartedAtGreaterThanEqualAndStartedAtLessThanOrderByStartedAtAsc(
            userId, rangeStart, rangeEnd)
        .stream()
        .map(FocusSessionEntity::toDomain)
        .toList();
  }
}
