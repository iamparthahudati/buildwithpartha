package tech.buildwithpartha.lifeos.common.task;

import java.util.UUID;

/** Task-owned lookup contract used by Weekly Plan allocation and snapshots. */
public interface WeeklyPlanTaskPort {
  WeeklyPlanTaskSummary getAvailableTask(UUID userId, UUID taskId);

  WeeklyPlanTaskSummary getTask(UUID userId, UUID taskId);
}
