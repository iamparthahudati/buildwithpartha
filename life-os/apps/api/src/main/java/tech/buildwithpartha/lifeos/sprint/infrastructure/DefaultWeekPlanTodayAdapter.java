package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.sprint.WeekPlanTodayPort;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlan;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanItem;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanRepository;

/**
 * Weekly Plan domain adapter implementing {@link WeekPlanTodayPort} for Today dashboard queries
 * (LOS-1415).
 */
@Component
public class DefaultWeekPlanTodayAdapter implements WeekPlanTodayPort {

  private final WeeklyPlanRepository weeklyPlanRepository;

  public DefaultWeekPlanTodayAdapter(WeeklyPlanRepository weeklyPlanRepository) {
    this.weeklyPlanRepository =
        Objects.requireNonNull(weeklyPlanRepository, "weeklyPlanRepository must not be null");
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<TodayWeekPlanSummary> getActiveWeeklyPlan(UUID userId, LocalDate localDate) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(localDate, "localDate must not be null");

    return weeklyPlanRepository.findByUserId(userId).stream()
        .filter(p -> !localDate.isBefore(p.weekStartDate()) && !localDate.isAfter(p.weekEndDate()))
        .max(Comparator.comparingInt(WeeklyPlan::revision))
        .map(this::toSummary);
  }

  private TodayWeekPlanSummary toSummary(WeeklyPlan plan) {
    int totalTasksCount = plan.items().size();
    int completedTasksCount =
        (int)
            plan.items().stream()
                .filter(i -> "DONE".equalsIgnoreCase(i.taskStatusSnapshot()))
                .count();

    List<TodayWeeklyGoalSummary> outcomes =
        plan.outcomes().stream()
            .map(
                outcome -> {
                  List<WeeklyPlanItem> linkedItems =
                      plan.items().stream()
                          .filter(i -> i.outcomeId().map(outcome.id()::equals).orElse(false))
                          .toList();
                  boolean completed =
                      !linkedItems.isEmpty()
                          && linkedItems.stream()
                              .allMatch(i -> "DONE".equalsIgnoreCase(i.taskStatusSnapshot()));
                  return new TodayWeeklyGoalSummary(outcome.id(), outcome.title(), completed);
                })
            .toList();

    return new TodayWeekPlanSummary(completedTasksCount, totalTasksCount, outcomes);
  }
}
