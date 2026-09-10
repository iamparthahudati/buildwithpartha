package tech.buildwithpartha.lifeos.task.infrastructure;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface SubtaskJpaRepository extends JpaRepository<SubtaskEntity, UUID> {
  List<SubtaskEntity> findByTaskIdOrderByPositionAsc(UUID taskId);

  List<SubtaskEntity> findByTaskIdInOrderByPositionAsc(Collection<UUID> taskIds);

  void deleteByTaskId(UUID taskId);
}
