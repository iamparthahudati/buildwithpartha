package tech.buildwithpartha.lifeos.common.progress;

import java.util.Map;
import java.util.UUID;

/** Domain-neutral read port for project progress metrics (LOS-1106). */
public interface ProjectProgressPort {

  ProjectProgressData getProjectProgress(UUID userId, UUID projectId, UUID labelId);

  record ProjectProgressData(
      int totalCount, Map<String, Integer> statusCounts, Double averageProgressPercentage) {}
}
