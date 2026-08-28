package tech.buildwithpartha.lifeos.sprint.application;

import java.time.LocalDate;

public record WeeklyPlanCapacityInput(LocalDate localDate, int availableMinutes) {}
