package tech.buildwithpartha.lifeos.task.api;

/** Wrapper conveying a task's milestone assignment; {@code milestone} is null when unassigned. */
public record TaskMilestoneAssignmentResponse(TaskMilestoneResponse milestone) {}
