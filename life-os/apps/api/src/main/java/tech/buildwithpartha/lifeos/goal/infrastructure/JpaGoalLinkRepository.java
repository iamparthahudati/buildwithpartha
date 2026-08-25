package tech.buildwithpartha.lifeos.goal.infrastructure;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.goal.domain.GoalLink;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkTargetType;

/** JPA adapter implementing {@link GoalLinkRepository}. */
@Repository
public class JpaGoalLinkRepository implements GoalLinkRepository {

  private final GoalLinkJpaRepository jpaRepository;

  public JpaGoalLinkRepository(GoalLinkJpaRepository jpaRepository) {
    this.jpaRepository = Objects.requireNonNull(jpaRepository, "jpaRepository must not be null");
  }

  @Override
  public GoalLink save(GoalLink link) {
    Objects.requireNonNull(link, "link must not be null");
    GoalLinkEntity entity = GoalLinkEntity.fromDomain(link);
    return jpaRepository.save(entity).toDomain();
  }

  @Override
  public Optional<GoalLink> findById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    return jpaRepository.findById(id).map(GoalLinkEntity::toDomain);
  }

  @Override
  public Optional<GoalLink> findByIdAndUserId(UUID id, UUID userId) {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByIdAndUserId(id, userId).map(GoalLinkEntity::toDomain);
  }

  @Override
  public List<GoalLink> findByGoalId(UUID goalId) {
    Objects.requireNonNull(goalId, "goalId must not be null");
    return jpaRepository.findByGoalId(goalId).stream().map(GoalLinkEntity::toDomain).toList();
  }

  @Override
  public List<GoalLink> findByGoalIdAndUserId(UUID goalId, UUID userId) {
    Objects.requireNonNull(goalId, "goalId must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByGoalIdAndUserId(goalId, userId).stream()
        .map(GoalLinkEntity::toDomain)
        .toList();
  }

  @Override
  public Optional<GoalLink> findByGoalIdAndTargetTypeAndTargetId(
      UUID goalId, GoalLinkTargetType targetType, UUID targetId) {
    Objects.requireNonNull(goalId, "goalId must not be null");
    Objects.requireNonNull(targetType, "targetType must not be null");
    Objects.requireNonNull(targetId, "targetId must not be null");
    return jpaRepository
        .findByGoalIdAndTargetTypeAndTargetId(goalId, targetType, targetId)
        .map(GoalLinkEntity::toDomain);
  }

  @Override
  public void delete(GoalLink link) {
    Objects.requireNonNull(link, "link must not be null");
    deleteById(link.id());
  }

  @Override
  public void deleteById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    jpaRepository.deleteById(id);
  }
}
