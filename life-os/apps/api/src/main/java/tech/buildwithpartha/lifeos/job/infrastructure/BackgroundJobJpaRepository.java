package tech.buildwithpartha.lifeos.job.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface BackgroundJobJpaRepository extends JpaRepository<BackgroundJobEntity, UUID> {

  String PENDING = "tech.buildwithpartha.lifeos.job.domain.BackgroundJobStatus.PENDING";
  String SUCCEEDED = "tech.buildwithpartha.lifeos.job.domain.BackgroundJobStatus.SUCCEEDED";
  String DEAD_LETTERED = "tech.buildwithpartha.lifeos.job.domain.BackgroundJobStatus.DEAD_LETTERED";

  @Query(
      "SELECT e FROM BackgroundJobEntity e WHERE e.status = "
          + PENDING
          + " AND e.nextAttemptAt <= :now ORDER BY e.nextAttemptAt ASC")
  List<BackgroundJobEntity> findDuePending(@Param("now") Instant now, PageRequest pageRequest);

  default List<BackgroundJobEntity> findDuePending(Instant now, int limit) {
    return findDuePending(now, PageRequest.of(0, limit));
  }

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      "DELETE FROM BackgroundJobEntity e WHERE e.status IN ("
          + SUCCEEDED
          + ", "
          + DEAD_LETTERED
          + ") AND e.updatedAt < :cutoff")
  int deleteTerminalOlderThan(@Param("cutoff") Instant cutoff);
}
