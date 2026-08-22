package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.TaskDependencyType;

/** Request payload for adding a task dependency link. */
public record AddDependencyRequest(
    @NotNull(message = "targetTaskId must not be null") UUID targetTaskId,
    @NotNull(message = "type must not be null") TaskDependencyType type) {}
