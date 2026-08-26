package tech.buildwithpartha.lifeos.common.progress;

import java.time.Instant;
import java.util.UUID;

/** Domain-neutral read port for task progress metrics (LOS-1106). */
public interface TaskProgressPort {

  TaskProgressData getTaskProgress(
      UUID userId, Instant rangeStart, Instant rangeEnd, Instant now, UUID projectId, UUID labelId);

  record TaskProgressData(
      int totalCount,
      int completedCount,
      int dueCount,
      int overdueCount,
      int highPriorityCount,
      int blockedCount) {}
}
