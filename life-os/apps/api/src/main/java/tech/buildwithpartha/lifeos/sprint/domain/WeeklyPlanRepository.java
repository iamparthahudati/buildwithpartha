package tech.buildwithpartha.lifeos.sprint.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface WeeklyPlanRepository {
  void lockUser(UUID userId);

  WeeklyPlan save(WeeklyPlan plan);

  Optional<WeeklyPlan> findByIdAndUserId(UUID id, UUID userId);

  List<WeeklyPlan> findByUserId(UUID userId);

  List<WeeklyPlan> findByUserIdAndWeekStartDate(UUID userId, LocalDate weekStartDate);

  Set<UUID> findExistingOutcomeIds(Set<UUID> outcomeIds);

  Set<UUID> findExistingItemIds(Set<UUID> itemIds);
}
