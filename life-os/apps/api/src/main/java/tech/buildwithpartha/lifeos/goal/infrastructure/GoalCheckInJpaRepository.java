package tech.buildwithpartha.lifeos.goal.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface GoalCheckInJpaRepository extends JpaRepository<GoalCheckInEntity, UUID> {
  Optional<GoalCheckInEntity> findByIdAndUserId(UUID id, UUID userId);

  List<GoalCheckInEntity> findByGoalIdOrderByRecordedAtDesc(UUID goalId);

  List<GoalCheckInEntity> findByGoalIdAndUserIdOrderByRecordedAtDesc(UUID goalId, UUID userId);
}
