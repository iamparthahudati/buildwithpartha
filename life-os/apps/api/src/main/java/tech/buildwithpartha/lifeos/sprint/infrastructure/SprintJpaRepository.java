package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SprintJpaRepository extends JpaRepository<SprintEntity, UUID> {
  Optional<SprintEntity> findByIdAndUserId(UUID id, UUID userId);

  List<SprintEntity> findByUserIdOrderByStartDateAsc(UUID userId);

  @Query(value = "SELECT id FROM public.users WHERE id = :userId FOR UPDATE", nativeQuery = true)
  Object lockUserById(@Param("userId") UUID userId);

  @Query(
      "SELECT COUNT(s) > 0 FROM SprintEntity s WHERE s.userId = :userId"
          + " AND s.status <> tech.buildwithpartha.lifeos.sprint.domain.SprintStatus.CANCELLED"
          + " AND s.startDate <= :endDate AND s.endDate >= :startDate"
          + " AND (:excludeId IS NULL OR s.id <> :excludeId)")
  boolean hasOverlap(
      @Param("userId") UUID userId,
      @Param("startDate") LocalDate startDate,
      @Param("endDate") LocalDate endDate,
      @Param("excludeId") UUID excludeId);
}
