package tech.buildwithpartha.lifeos.common.sprint;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/** Domain-neutral Sprint read port for Today dashboard aggregation (LOS-1415). */
public interface SprintTodayPort {

  Optional<TodaySprintSummary> getActiveSprint(UUID userId, LocalDate localDate);

  record TodaySprintSummary(
      UUID sprintId,
      String name,
      int completedStoryPoints,
      int totalStoryPoints,
      LocalDate startDate,
      LocalDate endDate) {}
}
