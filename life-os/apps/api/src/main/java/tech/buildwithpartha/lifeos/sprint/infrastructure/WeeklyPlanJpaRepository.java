package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface WeeklyPlanJpaRepository extends JpaRepository<WeeklyPlanEntity, UUID> {
  Optional<WeeklyPlanEntity> findByIdAndUserId(UUID id, UUID userId);

  List<WeeklyPlanEntity> findByUserIdOrderByWeekStartDateDescRevisionDesc(UUID userId);

  List<WeeklyPlanEntity> findByUserIdAndWeekStartDateOrderByRevisionAsc(
      UUID userId, LocalDate weekStartDate);

  @Query(value = "SELECT id FROM public.users WHERE id = :userId FOR UPDATE", nativeQuery = true)
  Object lockUserById(@Param("userId") UUID userId);
}
