package tech.buildwithpartha.lifeos.sprint.application;

import java.util.List;

public record UpdateWeeklyPlanCommand(
    List<WeeklyPlanCapacityInput> capacities,
    List<WeeklyPlanOutcomeInput> outcomes,
    List<WeeklyPlanItemInput> items,
    long version) {}
