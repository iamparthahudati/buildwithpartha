package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotNull;

public record RestoreTaskRequest(@NotNull(message = "Version must be specified") Long version) {}
