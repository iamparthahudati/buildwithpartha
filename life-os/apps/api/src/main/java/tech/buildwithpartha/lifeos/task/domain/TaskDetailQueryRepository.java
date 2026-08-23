package tech.buildwithpartha.lifeos.task.domain;

import java.util.UUID;

/** Read port for loading Task detail relationships in a bounded number of queries. */
public interface TaskDetailQueryRepository {

  TaskDetailDependencies findDependencies(UUID userId, UUID taskId);
}
