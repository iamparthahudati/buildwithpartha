package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface SprintTaskJpaRepository extends JpaRepository<SprintTaskEntity, UUID> {
  List<SprintTaskEntity> findBySprintIdOrderByPositionAscIdAsc(UUID sprintId);
}
