package tech.buildwithpartha.lifeos.goal.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Domain repository contract for managing GoalLink persistence. */
public interface GoalLinkRepository {
  GoalLink save(GoalLink link);

  Optional<GoalLink> findById(UUID id);

  Optional<GoalLink> findByIdAndUserId(UUID id, UUID userId);

  List<GoalLink> findByGoalId(UUID goalId);

  List<GoalLink> findByGoalIdAndUserId(UUID goalId, UUID userId);

  Optional<GoalLink> findByGoalIdAndTargetTypeAndTargetId(
      UUID goalId, GoalLinkTargetType targetType, UUID targetId);

  void delete(GoalLink link);

  void deleteById(UUID id);
}
