package tech.buildwithpartha.lifeos.goal.api;

import jakarta.validation.constraints.NotNull;

/** Request DTO for archiving a Goal. */
public record ArchiveGoalRequest(@NotNull(message = "version is required") Long version) {}
