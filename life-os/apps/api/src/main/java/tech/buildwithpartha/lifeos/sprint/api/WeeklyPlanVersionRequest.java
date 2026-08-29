package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.Min;

public record WeeklyPlanVersionRequest(@Min(0) long version) {}
