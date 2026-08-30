package tech.buildwithpartha.lifeos.task.application;

import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

/** Lightweight view of a task assigned to a milestone (LOS-0826). */
public record MilestoneTaskView(
    UUID taskId, String title, TaskStatus status, TaskPriority priority, int estimateMinutes) {}
