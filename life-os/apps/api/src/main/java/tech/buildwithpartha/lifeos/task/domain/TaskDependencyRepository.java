package tech.buildwithpartha.lifeos.task.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Domain repository for managing task dependencies. */
public interface TaskDependencyRepository {

  TaskDependency save(TaskDependency dependency);

  void delete(UUID blockingTaskId, UUID blockedTaskId);

  boolean exists(UUID blockingTaskId, UUID blockedTaskId);

  Optional<TaskDependency> find(UUID blockingTaskId, UUID blockedTaskId);

  /** Finds all dependencies where the given task is the blocked task (i.e., task's blockers). */
  List<TaskDependency> findBlockersForTask(UUID blockedTaskId);

  /** Finds all dependencies where the given task is the blocking task (i.e., task's dependents). */
  List<TaskDependency> findDependentsForTask(UUID blockingTaskId);

  /** Finds all dependency edges for all tasks owned by the given user. */
  List<TaskDependency> findAllForUser(UUID userId);
}
