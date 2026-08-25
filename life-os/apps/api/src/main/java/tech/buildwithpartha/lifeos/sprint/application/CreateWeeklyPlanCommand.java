package tech.buildwithpartha.lifeos.sprint.application;

import java.time.LocalDate;
import java.util.List;

public record CreateWeeklyPlanCommand(
    LocalDate weekDate,
    List<WeeklyPlanCapacityInput> capacities,
    List<WeeklyPlanOutcomeInput> outcomes,
    List<WeeklyPlanItemInput> items) {}
