package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface WeeklyPlanOutcomeJpaRepository extends JpaRepository<WeeklyPlanOutcomeEntity, UUID> {
  List<WeeklyPlanOutcomeEntity> findByWeeklyPlanIdOrderByPositionAscIdAsc(UUID weeklyPlanId);

  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query("DELETE FROM WeeklyPlanOutcomeEntity item WHERE item.weeklyPlanId = :weeklyPlanId")
  void deleteByWeeklyPlanId(@Param("weeklyPlanId") UUID weeklyPlanId);

  @Query("SELECT item.id FROM WeeklyPlanOutcomeEntity item WHERE item.id IN :ids")
  Set<UUID> findExistingIds(@Param("ids") Set<UUID> ids);
}
