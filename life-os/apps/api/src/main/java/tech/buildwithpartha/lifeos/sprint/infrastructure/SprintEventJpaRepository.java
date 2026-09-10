package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface SprintEventJpaRepository extends JpaRepository<SprintEventEntity, UUID> {
  List<SprintEventEntity> findBySprintIdOrderByOccurredAtAscIdAsc(UUID sprintId);

  List<SprintEventEntity> findBySprintIdInOrderByOccurredAtAscIdAsc(Collection<UUID> sprintIds);
}
