package tech.buildwithpartha.lifeos.common.task;

import java.util.UUID;

/** Task-owned lookup contract for Sprint commitment validation and completion metrics. */
public interface SprintTaskPort {
  SprintTaskSummary getAvailableTask(UUID userId, UUID taskId);

  SprintTaskSummary getTask(UUID userId, UUID taskId);
}
