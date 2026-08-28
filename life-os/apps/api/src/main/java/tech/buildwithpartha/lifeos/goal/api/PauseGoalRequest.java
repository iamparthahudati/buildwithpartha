package tech.buildwithpartha.lifeos.goal.api;

import jakarta.validation.constraints.NotNull;

/** Request DTO for pausing a Goal. */
public record PauseGoalRequest(@NotNull(message = "version is required") Long version) {}
