package tech.buildwithpartha.lifeos.task.application;

import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskDetailDependencies;

/** Application result for the versioned Task detail aggregate. */
public record TaskDetailResult(
    Task task, TaskDetailDependencies dependencies, TaskDetailCounts counts) {}
