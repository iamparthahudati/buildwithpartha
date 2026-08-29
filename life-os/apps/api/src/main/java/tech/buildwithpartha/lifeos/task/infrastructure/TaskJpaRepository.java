package tech.buildwithpartha.lifeos.task.infrastructure;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface TaskJpaRepository extends JpaRepository<TaskEntity, UUID> {

  Optional<TaskEntity> findByIdAndUserId(UUID id, UUID userId);

  List<TaskEntity> findByUserId(UUID userId);

  List<TaskEntity> findByProjectId(UUID projectId);

  List<TaskEntity> findByUserIdAndMitDate(UUID userId, LocalDate mitDate);

  @Query(
      "SELECT t.id AS id, t.title AS title, t.status AS status, t.dueAt AS dueAt,"
          + " t.projectId AS projectId FROM TaskEntity t WHERE t.userId = :userId"
          + " AND t.dueAt >= :rangeStart AND t.dueAt < :rangeEnd"
          + " AND t.archivedAt IS NULL AND t.deletedAt IS NULL"
          + " ORDER BY t.dueAt ASC, t.id ASC")
  List<TaskCalendarEventProjection> findCalendarDueEvents(
      @Param("userId") UUID userId,
      @Param("rangeStart") Instant rangeStart,
      @Param("rangeEnd") Instant rangeEnd,
      Pageable pageable);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      "UPDATE TaskEntity t SET t.mitDate = NULL WHERE t.userId = :userId AND t.mitDate = :mitDate")
  void clearMitDateForUserAndDate(
      @Param("userId") UUID userId, @Param("mitDate") LocalDate mitDate);
}
