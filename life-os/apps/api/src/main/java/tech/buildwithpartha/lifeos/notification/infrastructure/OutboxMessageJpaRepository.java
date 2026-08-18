package tech.buildwithpartha.lifeos.notification.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface OutboxMessageJpaRepository extends JpaRepository<OutboxMessageEntity, UUID> {

  String PENDING = "tech.buildwithpartha.lifeos.notification.domain.OutboxMessageStatus.PENDING";
  String SENT = "tech.buildwithpartha.lifeos.notification.domain.OutboxMessageStatus.SENT";
  String DEAD_LETTERED =
      "tech.buildwithpartha.lifeos.notification.domain.OutboxMessageStatus.DEAD_LETTERED";

  @Query(
      "SELECT e FROM OutboxMessageEntity e WHERE e.status = "
          + PENDING
          + " AND e.nextAttemptAt <= :now ORDER BY e.nextAttemptAt ASC")
  List<OutboxMessageEntity> findDueForDispatch(@Param("now") Instant now, PageRequest pageRequest);

  default List<OutboxMessageEntity> findDueForDispatch(Instant now, int limit) {
    return findDueForDispatch(now, PageRequest.of(0, limit));
  }

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      "DELETE FROM OutboxMessageEntity e WHERE e.status IN ("
          + SENT
          + ", "
          + DEAD_LETTERED
          + ") AND e.updatedAt < :cutoff")
  int deleteTerminalOlderThan(@Param("cutoff") Instant cutoff);
}
