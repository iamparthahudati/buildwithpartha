package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ChangeTaskStatusRequest(
    @NotBlank(message = "Status must not be blank") String status,
    @NotNull(message = "Version must be specified") Long version) {}
