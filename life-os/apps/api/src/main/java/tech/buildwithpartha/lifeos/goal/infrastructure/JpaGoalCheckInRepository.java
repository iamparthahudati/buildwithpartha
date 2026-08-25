package tech.buildwithpartha.lifeos.goal.infrastructure;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckIn;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckInRepository;

/** JPA adapter implementing {@link GoalCheckInRepository}. */
@Repository
public class JpaGoalCheckInRepository implements GoalCheckInRepository {

  private final GoalCheckInJpaRepository jpaRepository;

  public JpaGoalCheckInRepository(GoalCheckInJpaRepository jpaRepository) {
    this.jpaRepository = Objects.requireNonNull(jpaRepository, "jpaRepository must not be null");
  }

  @Override
  public GoalCheckIn save(GoalCheckIn checkIn) {
    Objects.requireNonNull(checkIn, "checkIn must not be null");
    GoalCheckInEntity entity = GoalCheckInEntity.fromDomain(checkIn);
    return jpaRepository.save(entity).toDomain();
  }

  @Override
  public Optional<GoalCheckIn> findById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    return jpaRepository.findById(id).map(GoalCheckInEntity::toDomain);
  }

  @Override
  public Optional<GoalCheckIn> findByIdAndUserId(UUID id, UUID userId) {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByIdAndUserId(id, userId).map(GoalCheckInEntity::toDomain);
  }

  @Override
  public List<GoalCheckIn> findByGoalId(UUID goalId) {
    Objects.requireNonNull(goalId, "goalId must not be null");
    return jpaRepository.findByGoalIdOrderByRecordedAtDesc(goalId).stream()
        .map(GoalCheckInEntity::toDomain)
        .toList();
  }

  @Override
  public List<GoalCheckIn> findByGoalIdAndUserId(UUID goalId, UUID userId) {
    Objects.requireNonNull(goalId, "goalId must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByGoalIdAndUserIdOrderByRecordedAtDesc(goalId, userId).stream()
        .map(GoalCheckInEntity::toDomain)
        .toList();
  }

  @Override
  public void delete(GoalCheckIn checkIn) {
    Objects.requireNonNull(checkIn, "checkIn must not be null");
    deleteById(checkIn.id());
  }

  @Override
  public void deleteById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    jpaRepository.deleteById(id);
  }
}
