package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotNull;

public record ArchiveTaskRequest(@NotNull(message = "Version must be specified") Long version) {}
