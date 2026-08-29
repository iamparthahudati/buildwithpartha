package tech.buildwithpartha.lifeos.goal.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkTargetType;

interface GoalLinkJpaRepository extends JpaRepository<GoalLinkEntity, UUID> {
  Optional<GoalLinkEntity> findByIdAndUserId(UUID id, UUID userId);

  List<GoalLinkEntity> findByGoalId(UUID goalId);

  List<GoalLinkEntity> findByGoalIdAndUserId(UUID goalId, UUID userId);

  Optional<GoalLinkEntity> findByGoalIdAndTargetTypeAndTargetId(
      UUID goalId, GoalLinkTargetType targetType, UUID targetId);
}
