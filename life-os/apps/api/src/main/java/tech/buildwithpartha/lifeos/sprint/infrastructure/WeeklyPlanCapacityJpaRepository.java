package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface WeeklyPlanCapacityJpaRepository extends JpaRepository<WeeklyPlanCapacityEntity, UUID> {
  List<WeeklyPlanCapacityEntity> findByWeeklyPlanIdOrderByLocalDateAsc(UUID weeklyPlanId);

  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query("DELETE FROM WeeklyPlanCapacityEntity item WHERE item.weeklyPlanId = :weeklyPlanId")
  void deleteByWeeklyPlanId(@Param("weeklyPlanId") UUID weeklyPlanId);
}
