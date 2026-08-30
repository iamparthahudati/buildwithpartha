package tech.buildwithpartha.lifeos.task.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Domain repository for task-to-milestone assignments (LOS-0826). */
public interface TaskMilestoneRepository {

  TaskMilestoneAssignment save(TaskMilestoneAssignment assignment);

  Optional<TaskMilestoneAssignment> findByTaskId(UUID taskId);

  void deleteByTaskId(UUID taskId);

  /** Task ids currently assigned to the given milestone. */
  List<UUID> findTaskIdsByMilestoneId(UUID milestoneId);
}
