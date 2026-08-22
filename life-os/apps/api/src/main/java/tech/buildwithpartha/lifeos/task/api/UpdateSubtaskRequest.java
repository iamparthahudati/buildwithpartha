package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotBlank;

public record UpdateSubtaskRequest(
    @NotBlank(message = "Subtask title must not be blank") String title,
    Boolean completed,
    Integer position) {}
