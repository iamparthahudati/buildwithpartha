package tech.buildwithpartha.lifeos.common.project;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Domain-neutral Project read port for Today dashboard aggregation (LOS-1415). */
public interface ProjectTodayPort {

  List<TodayProjectSummary> getActiveProjects(UUID userId, int limit);

  Map<UUID, TodayProjectSummary> getProjectSummaries(UUID userId);

  record TodayProjectSummary(UUID id, String name, String color, String status) {}
}
