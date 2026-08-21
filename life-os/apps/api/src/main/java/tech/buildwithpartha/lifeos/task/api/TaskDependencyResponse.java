package tech.buildwithpartha.lifeos.task.api;

import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

/** Response DTO representing a task item in dependency views. */
public record TaskDependencyResponse(
    UUID id, String title, TaskStatus status, TaskPriority priority, Instant dueAt) {

  public static TaskDependencyResponse fromDomain(Task task) {
    return new TaskDependencyResponse(
        task.id(), task.title(), task.status(), task.priority(), task.dueAt().orElse(null));
  }
}
