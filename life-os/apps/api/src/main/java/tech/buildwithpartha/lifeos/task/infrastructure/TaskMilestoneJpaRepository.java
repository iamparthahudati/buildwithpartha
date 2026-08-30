package tech.buildwithpartha.lifeos.task.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Spring Data repository for {@link TaskMilestoneEntity}. */
interface TaskMilestoneJpaRepository extends JpaRepository<TaskMilestoneEntity, UUID> {

  @Query("select e.taskId from TaskMilestoneEntity e where e.milestoneId = :milestoneId")
  List<UUID> findTaskIdsByMilestoneId(@Param("milestoneId") UUID milestoneId);
}
