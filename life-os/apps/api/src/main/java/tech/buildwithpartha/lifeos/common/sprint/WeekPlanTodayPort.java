package tech.buildwithpartha.lifeos.common.sprint;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Domain-neutral Weekly Plan read port for Today dashboard aggregation (LOS-1415). */
public interface WeekPlanTodayPort {

  Optional<TodayWeekPlanSummary> getActiveWeeklyPlan(UUID userId, LocalDate localDate);

  record TodayWeekPlanSummary(
      int completedTasksCount, int totalTasksCount, List<TodayWeeklyGoalSummary> outcomes) {}

  record TodayWeeklyGoalSummary(UUID id, String title, boolean completed) {}
}
