package tech.buildwithpartha.lifeos.timeblock.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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

  List<TimeBlockEntity> findByProjectIdOrderByStartAtAsc(UUID projectId);

  List<TimeBlockEntity> findByTaskIdOrderByStartAtAsc(UUID taskId);

  long countByTaskIdAndUserId(UUID taskId, UUID userId);
}
