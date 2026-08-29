package tech.buildwithpartha.lifeos.goal.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Domain repository contract for managing GoalCheckIn persistence. */
public interface GoalCheckInRepository {
  GoalCheckIn save(GoalCheckIn checkIn);

  Optional<GoalCheckIn> findById(UUID id);

  Optional<GoalCheckIn> findByIdAndUserId(UUID id, UUID userId);

  List<GoalCheckIn> findByGoalId(UUID goalId);

  List<GoalCheckIn> findByGoalIdAndUserId(UUID goalId, UUID userId);

  List<GoalCheckIn> findByGoalIdAndUserId(UUID goalId, UUID userId, int page, int size);

  long countByGoalIdAndUserId(UUID goalId, UUID userId);

  void delete(GoalCheckIn checkIn);

  void deleteById(UUID id);
}
