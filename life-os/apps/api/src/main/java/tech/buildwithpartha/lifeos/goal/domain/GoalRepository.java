package tech.buildwithpartha.lifeos.goal.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Domain repository contract for managing Goal aggregate persistence. */
public interface GoalRepository {
  Goal save(Goal goal);

  Optional<Goal> findById(UUID id);

  Optional<Goal> findByIdAndUserId(UUID id, UUID userId);

  List<Goal> findByUserId(UUID userId);

  List<Goal> findByUserIdAndStatus(UUID userId, GoalStatus status);

  List<Goal> findByUserIdAndCategory(UUID userId, String category);

  void delete(Goal goal);

  void deleteById(UUID id);
}
