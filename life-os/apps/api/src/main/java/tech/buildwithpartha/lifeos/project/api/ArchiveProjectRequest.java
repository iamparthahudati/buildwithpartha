package tech.buildwithpartha.lifeos.project.api;

import jakarta.validation.constraints.NotNull;

/** Request DTO for archiving a Project with optimistic locking version. */
public record ArchiveProjectRequest(@NotNull Long version) {}
