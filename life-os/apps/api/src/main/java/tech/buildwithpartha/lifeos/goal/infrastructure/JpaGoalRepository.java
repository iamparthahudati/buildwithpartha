package tech.buildwithpartha.lifeos.goal.infrastructure;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;

/** JPA adapter implementing {@link GoalRepository}. */
@Repository
public class JpaGoalRepository implements GoalRepository {

  private final GoalJpaRepository jpaRepository;

  public JpaGoalRepository(GoalJpaRepository jpaRepository) {
    this.jpaRepository = Objects.requireNonNull(jpaRepository, "jpaRepository must not be null");
  }

  @Override
  public Goal save(Goal goal) {
    Objects.requireNonNull(goal, "goal must not be null");
    GoalEntity entity = GoalEntity.fromDomain(goal);
    return jpaRepository.save(entity).toDomain();
  }

  @Override
  public Optional<Goal> findById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    return jpaRepository.findById(id).map(GoalEntity::toDomain);
  }

  @Override
  public Optional<Goal> findByIdAndUserId(UUID id, UUID userId) {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByIdAndUserId(id, userId).map(GoalEntity::toDomain);
  }

  @Override
  public List<Goal> findByUserId(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByUserId(userId).stream().map(GoalEntity::toDomain).toList();
  }

  @Override
  public List<Goal> findByUserIdAndStatus(UUID userId, GoalStatus status) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(status, "status must not be null");
    return jpaRepository.findByUserIdAndStatus(userId, status).stream()
        .map(GoalEntity::toDomain)
        .toList();
  }

  @Override
  public List<Goal> findByUserIdAndCategory(UUID userId, String category) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(category, "category must not be null");
    return jpaRepository.findByUserIdAndCategory(userId, category).stream()
        .map(GoalEntity::toDomain)
        .toList();
  }

  @Override
  public void delete(Goal goal) {
    Objects.requireNonNull(goal, "goal must not be null");
    deleteById(goal.id());
  }

  @Override
  public void deleteById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    jpaRepository.deleteById(id);
  }
}
