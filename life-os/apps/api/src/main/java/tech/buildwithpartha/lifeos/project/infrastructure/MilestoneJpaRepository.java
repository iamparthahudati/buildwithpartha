package tech.buildwithpartha.lifeos.project.infrastructure;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface MilestoneJpaRepository extends JpaRepository<MilestoneEntity, UUID> {
  List<MilestoneEntity> findByProjectId(UUID projectId);

  @Query(
      "SELECT m FROM MilestoneEntity m, ProjectEntity p"
          + " WHERE m.projectId = p.id AND p.userId = :userId AND p.archivedAt IS NULL"
          + " AND m.date >= :startDate AND m.date <= :endDate"
          + " ORDER BY m.date ASC, m.id ASC")
  List<MilestoneEntity> findCalendarEvents(
      @Param("userId") UUID userId,
      @Param("startDate") LocalDate startDate,
      @Param("endDate") LocalDate endDate,
      Pageable pageable);
}
