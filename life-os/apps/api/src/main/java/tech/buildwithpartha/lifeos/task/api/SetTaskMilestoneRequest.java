package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Assigns a task to a project milestone (LOS-0826). */
public record SetTaskMilestoneRequest(
    @NotNull(message = "Milestone id must be specified") UUID milestoneId) {}
