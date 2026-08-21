package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotBlank;

public record CreateSubtaskRequest(
    @NotBlank(message = "Subtask title must not be blank") String title, Integer position) {}
