package tech.buildwithpartha.lifeos.goal.api;

import jakarta.validation.constraints.NotNull;

/** Request DTO for completing a Goal. */
public record CompleteGoalRequest(@NotNull(message = "version is required") Long version) {}
