package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record ReorderSubtasksRequest(
    @NotEmpty(message = "Subtask IDs list must not be empty") List<UUID> subtaskIds) {}
