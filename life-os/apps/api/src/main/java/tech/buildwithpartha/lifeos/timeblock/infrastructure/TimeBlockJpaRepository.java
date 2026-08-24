package tech.buildwithpartha.lifeos.timeblock.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface TimeBlockJpaRepository extends JpaRepository<TimeBlockEntity, UUID> {

  Optional<TimeBlockEntity> findByIdAndUserId(UUID id, UUID userId);

  List<TimeBlockEntity> findByUserIdOrderByStartAtAsc(UUID userId);

  @Query(
      "SELECT t FROM TimeBlockEntity t WHERE t.userId = :userId AND t.startAt < :rangeEnd AND"
          + " t.endAt > :rangeStart ORDER BY t.startAt ASC")
  List<TimeBlockEntity> findByUserIdAndRange(
      @Param("userId") UUID userId,
      @Param("rangeStart") Instant rangeStart,
      @Param("rangeEnd") Instant rangeEnd);

  @Query(
      "SELECT t FROM TimeBlockEntity t WHERE t.userId = :userId AND t.startAt < :rangeEnd AND"
          + " t.endAt > :rangeStart ORDER BY t.startAt ASC, t.id ASC")
  List<TimeBlockEntity> findCalendarEvents(
      @Param("userId") UUID userId,
      @Param("rangeStart") Instant rangeStart,
      @Param("rangeEnd") Instant rangeEnd,
      Pageable pageable);

  List<TimeBlockEntity> findByProjectIdOrderByStartAtAsc(UUID projectId);

  List<TimeBlockEntity> findByTaskIdOrderByStartAtAsc(UUID taskId);

  List<TimeBlockEntity> findByUserIdAndProjectIdOrderByStartAtAsc(UUID userId, UUID projectId);

  List<TimeBlockEntity> findByUserIdAndTaskIdOrderByStartAtAsc(UUID userId, UUID taskId);

  @Query(
      "SELECT t FROM TimeBlockEntity t WHERE t.userId = :userId"
          + " AND t.status <>"
          + " tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus.CANCELLED"
          + " AND t.startAt < :rangeEnd AND t.endAt > :rangeStart"
          + " AND (:excludeId IS NULL OR t.id <> :excludeId) ORDER BY t.startAt ASC")
  List<TimeBlockEntity> findOverlappingByUserId(
      @Param("userId") UUID userId,
      @Param("rangeStart") Instant rangeStart,
      @Param("rangeEnd") Instant rangeEnd,
      @Param("excludeId") UUID excludeId);

  long countByTaskIdAndUserId(UUID taskId, UUID userId);
}
