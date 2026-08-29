package tech.buildwithpartha.lifeos.goal.api;

import jakarta.validation.constraints.NotNull;

/** Request DTO for restoring an archived Goal. */
public record RestoreGoalRequest(@NotNull(message = "version is required") Long version) {}
