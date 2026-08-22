package tech.buildwithpartha.lifeos.project.api;

import jakarta.validation.constraints.NotNull;

/** Request DTO for restoring a Project with optimistic locking version. */
public record RestoreProjectRequest(@NotNull Long version) {}
